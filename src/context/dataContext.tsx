import { Config } from '../config';
import axios from 'axios';
import * as React from 'react';

function postAPICall(api, payload: any, accessToken: string, put?: boolean) {
    return new Promise(async (resolve, reject) => {
        axios[put ? 'put' : 'post'](api, payload, {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
            .then((res) => { resolve(res); })
            .catch((err) => { console.warn(err); reject(err); });
    });
}

function makeAPICall(api, accessToken: string) {
    return new Promise(async (resolve, reject) => {
        axios.get(api, {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
            .then((res) => { resolve(res); })
            .catch((err) => { console.warn(err); reject(err); });
    });
}

async function getDevicesForApps(appHosts: Array<string>, domain: string, token: string) {
    return new Promise(async (resolve, reject) => {
        const appDevices = {};
        try {
            for (const host in appHosts) {
                const res: any = await makeAPICall(`https://${appHosts[host]}${domain}/api/preview/devices`, token)
                appDevices[appHosts[host]] = res.data.value;
            }
            resolve(appDevices);
        } catch (err) { console.warn(err); reject(err); }
    })
}

async function getDeviceProperty(appHost: string, domain: string, deviceId: string, token: string) {
    return new Promise(async (resolve, reject) => {
        let res1, res2: any = null;
        try {
            res1 = await makeAPICall(`https://${appHost}${domain}/api/preview/devices/${deviceId}/properties`, token)
            res2 = await makeAPICall(`https://${appHost}${domain}/api/preview/devices/${deviceId}/cloudProperties`, token)
            resolve(Object.assign({}, res1.data || {}, res2.data || {}));
        } catch (err) { console.warn(err); reject(err); }
    })
}

async function getMapData(token: string, templates: any, appDevices: Array<any>, filteredApps: Array<string>) {
    const locations: Array<any> = [];
    const meta: Array<any> = [];

    //TODO: refactor to make efficient
    const validTemplates: any = [];
    for (const key in templates) { validTemplates.push(templates[key]) }

    console.log('Map fetch:' + new Date(Date.now()));

    for (const appId in appDevices) {
        if (filteredApps.indexOf(appId) === -1) { continue; }

        const devices = appDevices[appId];
        for (const device in devices) {
            if (validTemplates.indexOf(devices[device]['instanceOf']) > -1) {
                const telemetry: any = await makeAPICall(`https://${appId}${Config.AppDNS}/api/preview/devices/${devices[device]['id']}/telemetry/location`, token);

                if (telemetry?.data?.value) {
                    locations.push(telemetry.data.value);
                    // truckDetail in maps.tsx
                    meta.push({
                        id: devices[device]['id'],
                        host: `${appId}${Config.AppDNS}`,
                        displayName: devices[device]['displayName'],
                        location: telemetry.data.value,
                        image: devices[device]['__properties'] ? devices[device]['__properties']['vehicleImage'] : null
                    })
                };
            } else { continue; }
        }
    }
    return { locations, meta };
}

export const DataContext = React.createContext({});

export class DataProvider extends React.PureComponent {

    private mapDataTimer: any = null;

    startMapData = async (getToken: Function, templates: any, filteredApps: Array<string>) => {
        if (this.mapDataTimer || (this.state.devices && Object.keys(this.state.devices).length === 0)) { return; }
        console.log('Map start');
        let dataFetch = -1; // only fetch the map data once a minute but update the map control more frequently
        this.mapDataTimer = setInterval(async () => {
            if (dataFetch <= 0) {
                dataFetch = 10;
                const token = await getToken();
                const res = await getMapData(token, templates, this.state.devices, filteredApps);
                this.setState({ map: res });
            } else {
                dataFetch--
            }
        }, 6000);
    }

    stopMapData() {
        clearInterval(this.mapDataTimer);
        this.mapDataTimer = null;
        console.log('Map stop');
    }

    refreshMap = async (getToken: Function, templates: any, filteredApps: Array<string>) => {
        this.stopMapData();
        this.startMapData(getToken, templates, filteredApps);
    }

    getDevices = async (appHosts: Array<string>, token: string, filteredApps: Array<string>, overrideCache: boolean) => {
        // ONLY THIS METHOD SHOULD UPDATE THE devices STATE PROPERTY
        let devices: any = null;
        if (!overrideCache && Config.cacheAppDevices) {
            try {
                devices = JSON.parse(localStorage.getItem('cachedDevices') as string);
            } catch { };
        }

        if (!devices || devices === '') {
            devices = await getDevicesForApps(appHosts, Config.AppDNS, token);
            localStorage.setItem('cachedDevices', JSON.stringify(devices));
        }

        this.setState({ devices });

        for (const appId in this.state.devices) {
            if (filteredApps.indexOf(appId) === -1) { continue; }
            const propDevices: any = this.state.devices[appId];
            const length = propDevices.length;
            const newState = Object.assign({}, this.state.devices);
            for (let i = 0; i < length; i++) {
                const props = await getDeviceProperty(appId, Config.AppDNS, propDevices[i].id, token);
                newState[appId][i]['__properties'] = props;
            }
            this.setState({ devices: newState });
        }
    }

    sendCommand = async (host: string, id: string, name: string, body: any, token: string) => {
        const response = await postAPICall(`https://${host}/api/preview/devices/${id}/commands/${name}`, body, token);
        return response;
    }

    sendDesired = async (host: string, id: string, payload: any, token: string) => {
        const response = await postAPICall(`https://${host}/api/preview/devices/${id}/properties`, payload, token, true);
        return response;
    }

    state: any = {
        map: {}, // {deviceId: {meta, location}}
        devices: {}, // {appid: [{device}]}
        getDevices: this.getDevices,
        startMapData: this.startMapData,
        stopMapData: this.stopMapData,
        refreshMap: this.refreshMap,
        sendCommand: this.sendCommand,
        sendDesired: this.sendDesired
    }

    render() {
        return (
            <DataContext.Provider value={this.state}>
                {this.props.children}
            </DataContext.Provider>
        )
    }
}