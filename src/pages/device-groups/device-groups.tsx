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

function addDeviceGroup(authContext: any, appHost: any, deviceGroupId: string, deviceGroupDisplayName: string, deviceGroupDescription: string, deviceTemplate: string) {
    return new Promise(async (resolve, reject) => {
        const centralAccessToken = await authContext.getCentralAccessToken();
        let deviceGroupRes: any = {};

        let filterValue = "SELECT * FROM devices WHERE $template = \"" + deviceTemplate + "\"";
        let computedQueryLabelContent = document.getElementById('computedPropertyId')?.textContent;
        if(computedQueryLabelContent) {
            filterValue = computedQueryLabelContent;
        }
        axios.put(`https://${appHost}/api/deviceGroups/${deviceGroupId}?api-version=${Config.APIVersion}`,
            {
                'displayName': deviceGroupDisplayName,
                'description': deviceGroupDescription,
                'filter': filterValue
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
    const [addingDeviceGroup, addDeviceGroupResponse, errorAddingDeviceGroup, callAddDeviceGroup] = usePromise({ promiseFn: () => addDeviceGroup(authContext, appHost, payload.deviceGroupId, payload.deviceGroupDisplayName, payload.deviceGroupDescription, payload.deviceTemplate) });

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
                            <div className="field">
                                    <div>Id</div>
                                    <div>{deviceGroup.id}</div>
                                </div>
                                <div className="field">
                                    <div>Name</div>
                                    <div>{deviceGroup.displayName}</div>
                                </div>
                                <div className="field">
                                    <div>Description</div>
                                    <div>{deviceGroup.description}</div>
                                </div>
                                <div className="field">
                                    <div>Filter</div>
                                    <div>{deviceGroup.filter}</div>
                                </div>                                                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>            
        </div >
        )
    }
    let selectedTemplate = "";
    const updateSelectedTemplate = (e) => {
        selectedTemplate = e.target.value;
        updateSystemFilterQuery();
    }

    const updatePayload = (e) => {
        const s: any = Object.assign({}, payload);
        s[e.target.name] = e.target.value;
        setPayload(s);
    }

    let systemFilter = "";

    let systemFilterId = "";
    const updateSystemFilterId = (e) => {
        systemFilterId = e.target.value;
        updateSystemFilterQuery();
    }

    let systemFilterTimeStamp = "";
    const updateSystemFilterTimeStamp = (e) => {
        systemFilterTimeStamp = e.target.value;
        updateSystemFilterQuery();
    }

    let systemFilterProvisioned = "";
    const updateSystemFilterProvisioned = (e) => {
        if(e.target.value === "Yes") {
            systemFilterProvisioned = "true"
        }
        else { 
            systemFilterProvisioned = "false"
        }
        updateSystemFilterQuery();
    }

    let systemFilterSimulated = "";
    const updateSystemFilterSimulated = (e) => {
        if(e.target.value === "Yes") {
            systemFilterSimulated = "true"
        }
        else { 
            systemFilterSimulated = "false"
        }
        updateSystemFilterQuery();
    }
    
    const updateSystemFilterQuery = () => {
        if(!selectedTemplate && document.getElementsByName('deviceTemplate').length === 1) {
            selectedTemplate = (document.getElementsByName('deviceTemplate')[0] as HTMLInputElement).value;
        }
        if(selectedTemplate) 
        {
            systemFilter = "SELECT * FROM devices WHERE $template =" + "\"" + selectedTemplate + "\"";
            if(systemFilterId.length > 0) {
                systemFilter = systemFilter + " AND $id=" + systemFilterId;
            }
            
            if(systemFilterTimeStamp.length > 0) {
                systemFilter = systemFilter + " AND $ts=" + systemFilterTimeStamp;
            }

            if(systemFilterProvisioned.length > 0) {
                systemFilter = systemFilter + " AND $provisioned=" + systemFilterProvisioned;
            }

            if(systemFilterSimulated.length > 0) {
                systemFilter = systemFilter + " AND $simulated=" + systemFilterSimulated;
            }

            let capabilityFilters = "";
            if(document.getElementsByName('capabilityFilterField') && document.getElementsByName('capabilityFilterValue')) {
                for(let capabilityFilterIndex = 0; capabilityFilterIndex < document.getElementsByName('capabilityFilterField').length; capabilityFilterIndex++) {
                    if(document.getElementsByName('capabilityFilterField')[capabilityFilterIndex] && (document.getElementsByName('capabilityFilterField')[capabilityFilterIndex] as HTMLInputElement).value
                            && document.getElementsByName('capabilityFilterValue')[capabilityFilterIndex] && (document.getElementsByName('capabilityFilterValue')[capabilityFilterIndex] as HTMLInputElement).value){
                        let capabilityFilterName = (document.getElementsByName('capabilityFilterField')[capabilityFilterIndex] as HTMLInputElement).value;
                        let capabilityFilterValue= (document.getElementsByName('capabilityFilterValue')[capabilityFilterIndex] as HTMLInputElement).value;
                        capabilityFilters = capabilityFilters + " AND " + capabilityFilterName + "=" + capabilityFilterValue;
                    }
                }
            }
            systemFilter = systemFilter + capabilityFilters;
            const computedQueryLabel = document.getElementById('computedPropertyId');
            if(computedQueryLabel) {
                computedQueryLabel.textContent = systemFilter;
            }            
        }
    }

    const addInput = ()  => {
        const container = document.getElementById('capability-filter-cont');
        let inputFilterName = document.createElement('input');
        let inputFilterValue = document.createElement('input');
        let filterNameValueDiv = document.createElement('div');
        filterNameValueDiv.className = 'filter';
        inputFilterName.placeholder = 'Filter name';
        inputFilterValue.placeholder = 'Filter value';
        inputFilterName.className = 'filter-name';
        inputFilterValue.className = 'filter-value';
        inputFilterName.type = 'text';
        inputFilterName.autocomplete = 'off';
        inputFilterValue.type = 'text';
        inputFilterValue.autocomplete = 'off';
        inputFilterName.name = 'capabilityFilterField';
        inputFilterValue.name = 'capabilityFilterValue';
        inputFilterName.onchange =  function () { updateSystemFilterQuery()};
        inputFilterValue.onchange =  function () { updateSystemFilterQuery()};
        if(container) {
            filterNameValueDiv.appendChild(inputFilterName);
            filterNameValueDiv.appendChild(inputFilterValue);
            container.appendChild(filterNameValueDiv);
        }
        
        //document.getElementById('input-cont').appendChild(input);
    }

    const addFiltersDom: any = [];
    addFiltersDom.push(         
        <div id='input-cont'>                       
        <div className='filter container'>
                    <label className='filter-name filter-label'>$id</label>
                    
                        <input className='filter-value' id="filterIdValue" autoComplete='off' type='text' name='filterValue' onChange={updateSystemFilterId} placeholder='Device Id'  />                       
                      
        </div>
        <div className='filter container'>
            <label className='filter-name filter-label'>$provisioned</label>
            <div className="filter-name filter-option">
                <label> Yes </label>
                <input id="provisionedYesValue" type='radio' value="Yes" name='provisionedValue' onChange={updateSystemFilterProvisioned} />&nbsp; &nbsp; &nbsp; &nbsp;
                <label>No</label>
                <input id="provisionedNoValue" type='radio' value="No" name='provisionedValue' onChange={updateSystemFilterProvisioned} />
            </div>
        </div>
        <div className='filter container'>
            <label className='filter-name filter-label'>$simulated</label>
            <div className="filter-name filter-option">
                <label> Yes </label>
                <input id="simulatedYesValue" type='radio' value="Yes" name='simulatedValue' onChange={updateSystemFilterSimulated} /> &nbsp; &nbsp; &nbsp; &nbsp;
                <label>No</label>
                <input id="simulatedNoValue" type='radio' value="No" name='simulatedValue' onChange={updateSystemFilterSimulated} />
            </div>
        </div>
        <div className='filter container'>
            <label className='filter-name filter-label'>$ts</label>
            <input className='filter-value' id="filterIdValue" autoComplete='off' type='text' name='filterValue' onChange={updateSystemFilterTimeStamp} placeholder='2021-09-14T11:40:00Z'  />
        </div>
    </div>);

    const addCapabilityFiltersDom: any = [];
    addCapabilityFiltersDom.push(
        <div>
            <div id='capability-filter-cont'>
            <div className='filter'>
                <input className='filter-name' autoComplete='off' type='text' name='capabilityFilterField' onChange={updateSystemFilterQuery} placeholder='Filter name'  />
                <input className='filter-value' autoComplete='off' type='text' name='capabilityFilterValue' onChange={updateSystemFilterQuery} placeholder='Filter value'  />
            </div>
            </div>
            <br/>
            <div>
                <button className='btn btn-primary' onClick={() => { addInput(); }}>+Add capability filter</button>
            </div>            
        </div>
    );

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
                                <input autoComplete='off' type='text' name='deviceGroupDisplayName' value={payload.deviceGroupDisplayName} onChange={updatePayload} placeholder={RESX.devicegroups.form.field1Label_placeholder} />
                            </div>
                            <div className='fields'>
                                <label>{RESX.devicegroups.form.field2Label}</label><br />
                                <input autoComplete='off' type='text' name='deviceGroupDescription' value={payload.deviceGroupDescription} onChange={updatePayload} placeholder={RESX.devicegroups.form.field2Label_placeholder} />
                            </div>               
                            <div className='fields'>
                                <label>{RESX.devicegroups.form.field3Label}</label><br />
                                <input autoComplete='off' type='text' name='deviceGroupId' value={payload.deviceGroupId} onChange={updatePayload} placeholder={RESX.devicegroups.form.field3Label_placeholder} />
                            </div>                                         
                            <div className='fields'>
                                <label>{RESX.devicegroups.form.field4Label}</label><br />     
                                <select onChange={updateSelectedTemplate} name='deviceTemplate' defaultValue={RESX.devicegroups.form.field4Label_placeholder}>
                                <option disabled hidden>
                                    {RESX.devicegroups.form.field4Label_placeholder}
                                </option>
                                {deviceTemplatesDom}
                                </select>              
                            </div>
                            <div className='fields device-group-filter'>
                                <label>System Filters</label><br />
                                {addFiltersDom}
                            </div>
                            <div className='fields device-group-filter'>
                                <label>Capability Filters</label><br />
                                {addCapabilityFiltersDom}
                            </div>                        
                        </div>
                        <div className='device-group-filter'>
                            <label>Computed Filter</label><br />
                            <label id='computedPropertyId' className='filter-name'></label><br />
                        </div>

                        <br />
                        <button onClick={() => { callAddDeviceGroup(); }} className='btn btn-primary'>{RESX.devicegroups.form.cta1Label}</button>
                        {addingDeviceGroup ? <><div className='loader'><label>{RESX.devicegroups.deviceGroupAdding}</label><BeatLoader size='16px' /></div></> : null}

                        {!addingDeviceGroup && addDeviceGroupResponse ?
                            <br></br>
                            : null}
                        {!addingDeviceGroup && errorAddingDeviceGroup ? <><br /><br /><label>{RESX.devicegroups.deviceGroupAddingError}</label><span className='error'>{errorAddingDeviceGroup.response.data.error.message}</span></> : null}
                        <br /><br />

                        <h3>{RESX.devicegroups.title2} for {selectedApp.properties.displayName} </h3>

                        <div className='form-selector device-groups-selector'>{deviceGroupsDom}</div>
                    </>}
            </>
            : null
        }
    </div>    
}