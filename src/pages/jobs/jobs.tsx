import './jobs.css';
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

function getJobs(authContext: any, appHost: any) {
    return new Promise(async (resolve, reject) => {
        const accessToken = await authContext.getCentralAccessToken();
        axios.get(`https://${appHost}/api/jobs?api-version=${Config.APIVersion}`, { headers: { Authorization: 'Bearer ' + accessToken } })
            .then((res) => {
                resolve(res.data.value);
            })
            .catch((error) => {
                console.log('error', error);
                reject(error);
            });
    });
}

function addJob(authContext: any, appHost: any, addJobDisplayName: string, guid: string, deviceGroup: string, deviceTemplate: string, jobType: string) {
    return new Promise(async (resolve, reject) => {
        const centralAccessToken = await authContext.getCentralAccessToken();
        let jobRes: any = {};
        axios.put(`https://${appHost}/api/jobs/${guid}?api-version=${Config.PreviewAPIVersion}`,
            {
                'displayName': addJobDisplayName,
                'group': deviceGroup,
                'data': [{ 'type': jobType, 'target': deviceTemplate, 'path': 'debug', 'value': 'updated value' }]
            }, { headers: { Authorization: 'Bearer ' + centralAccessToken } })
            .then((res) => {
                jobRes = res;
            })
            .then(() => {
                resolve(Object.assign({}, jobRes.data));
            })            
            .catch((error) => {
                reject(error);
            });
    });
}

function getDeviceGroups(authContext: any, appHost: any) {
    return new Promise(async (resolve, reject) => {
        const accessToken = await authContext.getCentralAccessToken();
        if(appHost) {
        axios.get(`https://${appHost}/api/deviceGroups?api-version=${Config.APIVersion}`, { headers: { Authorization: 'Bearer ' + accessToken } })
            .then((res) => {
                resolve(res.data.value);
            })
            .catch((error) => {
                console.log('error', error);
                reject(error);
            });
        }
    });
}


export default function Jobs() {

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

    const [loadingJobs, appJobs, , fetchJobs] = usePromise({ promiseFn: () => getJobs(authContext, appHost) });
    const [addingJob, addJobResponse, errorAddingJob, callAddJob] = usePromise({ promiseFn: () => addJob(authContext, appHost, payload.addJobDisplayName, guid, payload.deviceGroup, payload.deviceTemplate, payload.jobType) });
    const [, deviceGroups, , fetchDeviceGroups] = usePromise({ promiseFn: () => getDeviceGroups(authContext, appHost) });

    // eslint-disable-next-line
    React.useEffect(() => { if (appHost) { fetchJobs(); } }, [selectedApp])
    React.useEffect(() => { fetchDeviceGroups(); }, [authContext, appHost])

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
    if(deviceGroups) {
        for(const dg in deviceGroups) {
            const deviceGroup = deviceGroups[dg];
            deviceGroupsDom.push(<option value={deviceGroup.id}>{deviceGroup.displayName}</option>);
        }
    }

    const jobsDom: any = [];
    for (const j in appJobs) {
        const job = appJobs[j];
        const jobsDataDom: any = [];
        for(const d in job.data) {
            const jobData = job.data[d];
            jobsDataDom.push(
            <div className='field'>
                <div>Data</div>
                <div className='data-table'>            
                    <div className='field'>
                        <div>Type</div>
                        <div>{jobData.type}</div>
                    </div>                
                    <div className='field'>
                        <div>target</div>
                        <div>{jobData.target}</div>
                    </div>                
                    <div className='field'>
                        <div>Value</div>
                        <div>{jobData.value}</div>
                    </div>                
                </div> 
            </div>    
            )
            }
        jobsDom.push(<div key={job.id} className='template-selector-card'>
            <div className="job-cards">
                <div className="job-card">
                    <div>
                        <div>
                            <div>
                                <div>{job.displayName}</div>
                                <div className='name'>{job.name}</div>
                            </div>
                        </div>
                        <div>
                            <div className='field'>
                                <div>Group</div>
                                <div>{job.group}</div>
                            </div>
                            <div className='field'>
                                <div>Status</div>
                                <div>{job.status}</div>
                            </div>
                            <div className='field'>
                                <div>Job ID</div>
                                <div>{job.id}</div>
                            </div>
                            <div className='field'>
                                <div>Progress</div>
                                <div className='data-table'>            
                                    <div className='field'>
                                        <div>Total: {job.progress.total}</div>
                                    </div>                
                                <div className='field'>
                                    <div>Pending: {job.progress.pending}</div>
                                </div>                
                                <div className='field'>
                                    <div>Completed: {job.progress.completed}</div>
                                </div>                
                                <div className='field'>
                                    <div>Failed: {job.progress.failed}</div>
                                </div>                                
                                </div>
                            </div>                              
                            {jobsDataDom}
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

    return <div className='jobs-page'>
        <h3>{RESX.jobs.title}</h3>
        <div className='form-selector jobs-selector'>
            {appsDom}
        </div>

        {Object.keys(selectedApp).length > 0 ?
            <>
                {Object.keys(selectedApp).length !== 0 && loadingJobs ? <div className='loader'><label>{RESX.app.fetching}</label><BeatLoader size='16px' /></div> :
                    <>
                        <h3>{RESX.jobs.title3}</h3>
                        <div className='form'>
                            <div className='fields'>
                                <label>{RESX.jobs.form.field1Label}</label><br />
                                <input autoComplete='off' type='text' name='addJobDisplayName' value={payload.addJobDisplayName} onChange={updatePayload} placeholder={RESX.jobs.form.field1Label_placeholder} />
                            </div>
                            <div className='fields'>
                                <label>{RESX.jobs.form.field2Label}</label><br />
                                <select onChange={updatePayload} name='deviceGroup' defaultValue={RESX.jobs.form.field2Label_placeholder}>
                                    <option disabled hidden>
                                    {RESX.jobs.form.field2Label_placeholder}
                                    </option>                               
                                    {deviceGroupsDom}
                                </select>                                        
                            </div>
                            <div className='fields'>
                                <label>{RESX.jobs.form.field4Label}</label><br />     
                                <select onChange={updatePayload} name='deviceTemplate' defaultValue={RESX.jobs.form.field4Label_placeholder}>
                                <option disabled hidden>
                                    {RESX.jobs.form.field4Label_placeholder}
                                </option>
                                {deviceTemplatesDom}
                                </select>              
                            </div>

                            <div className='fields'>
                                <label>{RESX.jobs.form.field3Label}</label><br />
                                <select onChange={updatePayload} name='jobType'  defaultValue={RESX.jobs.form.field3Label_placeholder}>
                                    <option disabled hidden>
                                        {RESX.jobs.form.field3Label_placeholder}
                                    </option>

                                    <option value="cloudProperty">Cloud property example</option>
                                    <option value="property">Property example</option>
                                    <option value="command">Command example</option>
                                </select>

                            </div>

                        </div>
                        <br />
                        <button onClick={() => { callAddJob(); }} className='btn btn-primary'>{RESX.jobs.form.cta1Label}</button>
                        {addingJob ? <><div className='loader'><label>{RESX.jobs.jobAdding}</label><BeatLoader size='16px' /></div></> : null}

                        {!addingJob && addJobResponse ?
                            <br></br>
                            : null}
                        {!addingJob && errorAddingJob ? <><br /><br /><label>{RESX.jobs.jobAddingError}</label><span className='error'>{errorAddingJob.response.data.error.message}</span></> : null}
                        <br /><br />
                        <h3>{RESX.jobs.title2} for {selectedApp.properties.displayName} </h3>

                        <div className='form-selector jobs-selector'>{jobsDom}</div>
                    </>}
            </>
            : null
        }
    </div>    
}