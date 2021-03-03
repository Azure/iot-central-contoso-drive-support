import './devices.css';
import { Config } from '../../config'
import useDevices from '../../hooks/useDevices'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from '@fortawesome/free-solid-svg-icons'

import ReactTable from 'react-table-v6';
import 'react-table-v6/react-table.css';

import moment from 'moment';
import React from 'react';

function getProperty(object, key) {
    return object.__properties ? object.__properties[key] || null : null;
}

export default function Devices({ authContext, dataContext }) {

    const appDeviceList = dataContext.devices;
    const apps = React.useMemo(() => {
        const ret = {};
        for (const i in authContext.activeSubscription.apps) {
            const app = authContext.activeSubscription.apps[i];
            if (authContext.filteredApps.indexOf(app.properties.applicationId) > -1) {
                ret[app.properties.applicationId] = { name: app.properties.displayName, host: app.properties.subdomain }
            }
        }
        return ret;
    }, [authContext.activeSubscription.apps, authContext.filteredApps]);

    let rows = [];
    for (const appId in appDeviceList) {
        if (authContext.filteredApps.indexOf(appId) === -1) { continue; }
        const devices = appDeviceList[appId];
        const innerRows = devices.map((element: any) => {
            return {
                app: apps[appId].name,
                id: element.id,
                displayName: element.displayName,
                provisioned: element.provisioned ? 'Yes' : 'No',
                approved: element.approved ? 'Yes' : 'No',
                link: `https://${apps[appId].host}${Config.AppDNS}/devices/details/${element.id}`,
                image: getProperty(element, 'vehicleImage') || 'noimage',
                diagMode: getProperty(element, 'debug') ? 'Yes' : 'No',
                model: getProperty(element, 'model'),
                serial: getProperty(element, 'serial'),
                lastConnected: getProperty(element, 'lastConnected') ? moment(getProperty(element, 'lastConnected')).startOf('day').fromNow() : 'No Date'
            }
        })
        rows = rows.concat(innerRows);
    }

    const [loadingDevices, , , fetch] = useDevices(true);

    let cols: any = [
        { 'Header': 'IoT Central', 'accessor': 'link', Cell: (({ value }) => { return <div className='cellwrapper cellwrapper-center' ><a href={value} rel='noreferrer' target='_blank'><FontAwesomeIcon icon={Icons.faExternalLinkAlt} /></a></div> }) },
        { 'Header': 'Vehicle', 'accessor': 'image', Cell: (({ value }) => { return <div className='cellwrapper-img'><img src={`./${value}.png`} alt=' vehicle' /></div> }) },
        { 'Header': 'Diag Mode', 'accessor': 'diagMode', Cell: (({ value }) => { return <div className='cellwrapper cellwrapper-center'>{value}</div> }) },
        { 'Header': 'Last Connected', 'accessor': 'lastConnected', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
        { 'Header': 'Application', 'accessor': 'app', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
        { 'Header': 'Device ID', 'accessor': 'id', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
        { 'Header': 'Model', 'accessor': 'model', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
        { 'Header': 'Serial', 'accessor': 'serial', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
        { 'Header': 'Name', 'accessor': 'displayName', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
        { 'Header': 'Provisioned', 'accessor': 'provisioned', Cell: (({ value }) => { return <div className='cellwrapper cellwrapper-center'>{value}</div> }) },
        { 'Header': 'Approved', 'accessor': 'approved', Cell: (({ value }) => { return <div className='cellwrapper cellwrapper-center' >{value}</div> }) },
    ]

    return <div className='devices-page'>
        <ReactTable loading={loadingDevices || (dataContext.devices && Object.keys(dataContext.devices).length > 0 ? false : true)} noDataText='' data={rows} columns={cols} showPagination={true} />
        <div><button className='btn btn-link' onClick={() => fetch()}>Refresh grid</button></div>
    </div>;

}