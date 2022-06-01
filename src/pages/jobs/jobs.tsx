import './jobs.css';
import { RESX } from '../../strings'
// import { Config } from '../../config';
// import { Styles } from '../../shared/styles';
// import { AuthContext } from '../../context/authContext';
// import usePromise from '../../hooks/usePromise';
// import BeatLoader from 'react-spinners/BeatLoader';

// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import * as Icons from '@fortawesome/free-solid-svg-icons'
// import ReactTable from 'react-table-v6';
// import 'react-table-v6/react-table.css';


// import axios from 'axios';
// import React from 'react';

/* API */

function getJobs(authContext: any, appHost: any) {
    // return new Promise(async (resolve, reject) => {
    //     const accessToken = await authContext.getCentralAccessToken();
    //     axios.get(`https://${appHost}/api/jobs?api-version=${Config.APIVersion}`, { headers: { Authorization: 'Bearer ' + accessToken } })
    //         .then((res) => {
    //             console.log('res', res);
    //             console.log(res.data.value);
    //             resolve(res.data.value);
    //         })
    //         .catch((error) => {
    //             console.log('error', error);
    //             reject(error);
    //         });
    // });
}


export default function Jobs() {
    // const authContext: any = React.useContext(AuthContext);
    // const [selectedApp, setSelectedApp] = React.useState<any>({});
    // const [selectedRoleId, setSelectedRoleId] = React.useState<any>('');
    // const [payload, setPayload] = React.useState<any>({});

    // const app = authContext.activeSubscription.apps[0];
    // var settedApp = setSelectedApp(app)
    // const appHost = selectedApp.properties ? selectedApp.properties.subdomain + Config.AppDNS : null;
    // const templateId = selectedApp.properties ? authContext.filteredAppsTemplates[selectedApp.properties.applicationId] || null : null;

    // const [loadingJobs, appJobs, , fetchJobs] = usePromise({ promiseFn: () => getJobs(authContext, appHost) });

    // // var loadData = getJobs(authContext, appHost);
    // // console.log('loadData', loadData);

    // let cols: any = [
    //     { 'Header': 'Job Id', 'accessor': 'id', Cell: (({ value }) => { return <div className='cellwrapper cellwrapper-center'>{value}</div> }) },
    //     { 'Header': 'Display Name', 'accessor': 'displayName', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
    //     { 'Header': 'Group', 'accessor': 'group', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
    //     { 'Header': 'Data', 'accessor': 'data', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
    //     { 'Header': 'Status', 'accessor': 'status', Cell: (({ value }) => { return <div className='cellwrapper'>{value}</div> }) },
    // ]
    // let rows = [];
    // for (const appJobId in appJobs) {
    //     console.log('appJobId', appJobId);
    //     if (appJobs.indexOf(appJobId) === -1) { continue; }
    //     const innerRows = appJobs.map((element: any) => {
    //         return {
    //             id: element.id,
    //             displayName: element.displayName,
    //             group: element.group,
    //             data: element.data,
    //             status: element.status,
    //         }
    //     })
    //     rows = rows.concat(innerRows);
    // }
    // console.log('Rows', rows);

    // return <div className='jobs-page'>
    //     <h3>{RESX.jobs.title}</h3>
    //     <ReactTable loading={loadingJobs || (appJobs && Object.keys(appJobs).length > 0 ? false : true)} noDataText='' data={rows} columns={cols} showPagination={true} />

    // </div>
    return <div className='jobs-page'>
        <h3>{RESX.jobs.title}</h3>
    </div>    
}