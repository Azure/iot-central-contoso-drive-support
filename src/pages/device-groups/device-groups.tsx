import './device-groups.css';
import { RESX } from '../../strings'
import { Config } from '../../config';
import { Styles } from '../../shared/styles';
import { AuthContext } from '../../context/authContext';
import { DataContext } from '../../context/dataContext';
import usePromise from '../../hooks/usePromise';
import BeatLoader from 'react-spinners/BeatLoader';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from '@fortawesome/free-solid-svg-icons'
// import ReactTable from 'react-table-v6';
// import 'react-table-v6/react-table.css';


import axios from 'axios';
import React from 'react';

import {v4 as uuidv4} from 'uuid';

/* API */

function getDeviceGroups(authContext: any, appHost: any) {
    return new Promise(async (resolve, reject) => {
        const accessToken = await authContext.getCentralAccessToken();
        axios.get(`https://${appHost}/api/deviceGroups?api-version=${Config.APIVersion}`, { headers: { Authorization: 'Bearer ' + accessToken } })
            .then((res) => {
                resolve(res.data.value);
            })
            .catch((error) => {
                console.log('error', error);
                reject(error);
            });
    });
}

function addDeviceGroup(authContext: any, appHost: any, deviceGroupDisplayName: string, guid: string, deviceGroup: string, deviceTemplate: string, jobType: string) {
    return new Promise(async (resolve, reject) => {
        const centralAccessToken = await authContext.getCentralAccessToken();
        let deviceGroupRes: any = {};
        axios.put(`https://${appHost}/api/devicegroups/${guid}?api-version=${Config.PreviewAPIVersion}`,
            {
                'displayName': deviceGroupDisplayName,
                'group': deviceGroup,
                'data': [{ 'type': jobType, 'target': deviceTemplate, 'path': 'debug', 'value': 'updated value' }]
            }, { headers: { Authorization: 'Bearer ' + centralAccessToken } })
            .then((res) => {
                deviceGroupRes = res;
            })
            .then(() => {
                resolve(Object.assign({}, deviceGroupRes.data));
            })            
            .catch((error) => {
                reject(error);
            });
    });
}

export default function DeviceGroups() {

    const authContext: any = React.useContext(AuthContext);
    const dataContext: any = React.useContext(DataContext);
    const [selectedApp, setSelectedApp] = React.useState<any>({});
    const [payload, setPayload] = React.useState<any>({});

    const appDeviceList = dataContext.devices;
    const deviceTemplatesDom: any = [];
    for (const appId in appDeviceList) {
        if (authContext.filteredApps.indexOf(appId) === -1) { continue; }
        const devices = appDeviceList[appId];
        devices.forEach(element => {
            deviceTemplatesDom.push(<option value={element.template}>{element.displayName}</option>);
        });
    }    
    const appHost = selectedApp.properties ? selectedApp.properties.subdomain + Config.AppDNS : null;
    let guid = uuidv4();

    const [loadingDeviceGroups, appDeviceGroups, , fetchDeviceGroups] = usePromise({ promiseFn: () => getDeviceGroups(authContext, appHost) });

    // eslint-disable-next-line
    React.useEffect(() => { if (appHost) { fetchDeviceGroups(); } }, [selectedApp])

    const appsDom: any = [];
    for (const a in authContext.activeSubscription.apps) {
        const app = authContext.activeSubscription.apps[a]
        const include = authContext.filteredApps.indexOf(app.properties.applicationId) > -1;
        if (!include) { continue; }
        appsDom.push(<div key={app.properties.applicationId} className='template-selector-card'>
            <button className='btn btn-selector' onClick={() => { setSelectedApp(app) }}>
                <div><FontAwesomeIcon icon={Icons.faCheck} size='3x' color={selectedApp.properties && selectedApp.properties.applicationId === app.properties.applicationId ? Styles.successColorAlt : Styles.brightColorDim} /></div>
                <div>{app.properties.displayName}</div>
            </button>
        </div >)
    }

    const deviceGroupsDom: any = [];
    for (const j in appDeviceGroups) {
        const deviceGroup = appDeviceGroups[j];
        deviceGroupsDom.push(<div key={deviceGroup.id} className='template-selector-card'>
            <div className="device-group-cards">
                <div className="device-group-card">
                    <div>
                        <div>
                            <div>
                                <div>{deviceGroup.displayName}</div>
                                <div className='name'>{deviceGroup.description}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>            
        </div >
        )
    }

    const updatePayload = (e) => {
        const s: any = Object.assign({}, payload);
        s[e.target.name] = e.target.value;
        setPayload(s);
    }

    return <div className='device-groups-page'>
        <h3>{RESX.devicegroups.title}</h3>
        <div className='form-selector device-groups-selector'>
            {appsDom}
        </div>

        {Object.keys(selectedApp).length > 0 ?
            <>
                {Object.keys(selectedApp).length !== 0 && loadingDeviceGroups ? <div className='loader'><label>{RESX.app.fetching}</label><BeatLoader size='16px' /></div> :
                    <>
                        <h3>{RESX.devicegroups.title3}</h3>
                        <div className='form'>
                            <div className='fields'>
                                <label>{RESX.devicegroups.form.field1Label}</label><br />
                                <input autoComplete='off' type='text' name='deviceGroupDisplayName' value={payload.deviceGroupDisplayName} onChange={updatePayload} placeholder={RESX.jobs.form.field1Label_placeholder} />
                            </div>
                            <div className='fields'>
                                <label>{RESX.devicegroups.form.field2Label}</label><br />
                                <select onChange={updatePayload} name='deviceGroup' defaultValue={RESX.devicegroups.form.field2Label_placeholder}>
                                    <option disabled hidden>
                                    {RESX.devicegroups.form.field2Label_placeholder}
                                    </option>                               
                                    {deviceGroupsDom}
                                </select>                                        
                            </div>
                            <div className='fields'>
                                <label>{RESX.devicegroups.form.field4Label}</label><br />     
                                <select onChange={updatePayload} name='deviceTemplate' defaultValue={RESX.devicegroups.form.field4Label_placeholder}>
                                <option disabled hidden>
                                    {RESX.devicegroups.form.field4Label_placeholder}
                                </option>
                                {deviceTemplatesDom}
                                </select>              
                            </div>
                        </div>
                        <br />
                        <h3>{RESX.devicegroups.title2} for {selectedApp.properties.displayName} </h3>

                        <div className='form-selector device-groups-selector'>{deviceGroupsDom}</div>
                    </>}
            </>
            : null
        }
    </div>    
}