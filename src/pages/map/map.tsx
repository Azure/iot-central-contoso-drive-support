import './map.css';
import { RESX } from '../../strings'
import { Config } from '../../config'
import { AuthContext } from '../../context/authContext';
import { DataContext } from '../../context/dataContext';
import ClipLoader from 'react-spinners/ClipLoader';
import useCommand from '../../hooks/useCommand';
import useDesired from '../../hooks/useDesired';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from '@fortawesome/free-solid-svg-icons'

import * as AzureMapsControl from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.css';

import { LKVProcessGraphicCard, IoTCentralAdapter, Theme, } from '@microsoft/iot-cardboard-js';
import '@microsoft/iot-cardboard-js/themes.css';

import * as reverse from 'reverse-geocode';

import React from 'react';

export default function Map() {
    const azureMap = React.useRef<any>(undefined);

    const authContext: any = React.useContext(AuthContext);
    const dataContext: any = React.useContext(DataContext);

    const [deviceDetail, setDeviceDetail] = React.useState<any>(null);
    const [diagMode, setDiagMode] = React.useState<any>(true);
    const [dataSourceId, setDataSourceId] = React.useState<any>(null);

    const [progressCommand, resultCommand, errorCommand, executeCommand] = useCommand({
        'name': 'firmware',
        'body': {},
        id: deviceDetail?.id || null,
        host: deviceDetail?.host || null
    });

    const [progressDiagnostics, resultDiagnostics, errorDiagnostics, setDesired] = useDesired({
        'body': { 'debug': diagMode },
        id: deviceDetail?.id || null,
        host: deviceDetail?.host || null
    });

    React.useEffect(() => {

        if (dataSourceId) {
            azureMap.current.sources.sources.forEach((source) => {
                if (source.id === dataSourceId) {
                    source.clear();
                    for (const i in dataContext.map.locations) {
                        const element = dataContext.map.locations[i];
                        source.add(new AzureMapsControl.data.Feature(new AzureMapsControl.data.Point([element.lon, element.lat]), dataContext.map.meta[i]))
                    }
                    setTimeout(() => {
                        localStorage.setItem('lastMap', JSON.stringify(dataContext.map));
                    }, 2500);
                }
            })
            return;
        }

        azureMap.current = new AzureMapsControl.Map('themap', {
            center: [-101.01378456484315, 35.37158987232064],
            zoom: 3,
            view: 'Auto',
            authOptions: {
                authType: AzureMapsControl.AuthenticationType.subscriptionKey,
                subscriptionKey: Config.AzureMapKey
            }
        });

        azureMap.current.events.add('ready', function () {
            azureMap.current.controls.add(new AzureMapsControl.control.ZoomControl(), {
                position: AzureMapsControl.ControlPosition.TopRight
            });

            const ds: any = new AzureMapsControl.source.DataSource();

            let lastMap: any = null;
            try {
                lastMap = JSON.parse(localStorage.getItem('lastMap') as string);
            } catch { }

            if (lastMap && lastMap.locations && lastMap.meta) {
                for (const i in lastMap.locations) {
                    ds.add(new AzureMapsControl.data.Feature(new AzureMapsControl.data.Point([lastMap.locations[i].lon, lastMap.locations[i].lat]), lastMap.meta[i]))
                }
            }

            azureMap.current.sources.add(ds);

            var pinLayer = new AzureMapsControl.layer.SymbolLayer(ds, 'mapPins', {
                iconOptions: {
                    image: 'pin-round-darkblue',
                    anchor: 'center',
                    allowOverlap: true
                }
            });
            azureMap.current.layers.add(pinLayer);

            const popup = new AzureMapsControl.Popup({
                pixelOffset: [0, 4],
                closeButton: false
            });

            azureMap.current.events.add('click', pinLayer, ((e) => {
                if (e.shapes && e.shapes.length > 0) {
                    var properties = e.shapes[0].getProperties();
                    setDeviceDetail(properties);
                }
            }));

            var popupTemplate = '<div class="map-popup"><div>{location}</div></div>';

            azureMap.current.events.add('mouseover', pinLayer, function (e) {
                //Make sure that the point exists.
                if (e.shapes && e.shapes.length > 0) {

                    try {
                        var properties = e.shapes[0].getProperties();
                    } catch { }

                    let text = 'No information yet';
                    if (properties && properties.location) {
                        const addr = reverse.lookup(properties.location.lat, properties.location.lon, 'us');
                        if (addr) {
                            text = `<div class='location'><div>${properties.displayName}</div><div>${addr.city}</div><div>${addr.zipcode},${addr.state_abbr}</div></div>`
                        }
                    }
                    popup.setOptions({
                        content: popupTemplate.replace(/{location}/g, text),
                        position: e.position
                    });
                    popup.open(azureMap.current);
                }
            });

            azureMap.current.events.add('mouseleave', pinLayer, function () {
                popup.close();
            });

            setDataSourceId(ds.id);
        });
        // eslint-disable-next-line
    }, [azureMap, dataContext.map])


    React.useEffect(() => {
        if (!dataSourceId || (dataContext.device && Object.keys(dataContext.devices).length === 0)) { return; }
        dataContext.refreshMap(authContext.getCentralAccessToken, authContext.filteredAppsTemplates, authContext.filteredApps);
        // eslint-disable-next-line
    }, [authContext.filteredApps]);

    React.useEffect(() => {
        if (!dataSourceId || (dataContext.device && Object.keys(dataContext.devices).length === 0)) { return; }
        dataContext.startMapData(authContext.getCentralAccessToken, authContext.filteredAppsTemplates, authContext.filteredApps);
        // eslint-disable-next-line
    }, [dataSourceId, dataContext.devices])

    const updateCommand = () => {
        if (!deviceDetail) { alert(RESX.map.actions.error); return; }
        executeCommand();
    }

    const diagnosticsMode = () => {
        if (!deviceDetail) { alert(RESX.map.actions.error); return; }
        setDesired();
        setDiagMode(!diagMode); // refactor
    }

    const chart = {
        'id': deviceDetail?.id || '',
        'name': deviceDetail?.displayName || '',
        'host': deviceDetail?.host || '',
        'image': deviceDetail?.image || null,
        'properties': ['battery', 'chargeLevel', 'temperature'],
        'propertyPositions': {
            'temperature': { left: '20%', top: '20%' },
            'chargeLevel': { left: '60%', top: '45%' },
            'battery': { right: '10%', top: '70%' },

        }
    }

    return <div className='map-page'>
        <h3>{RESX.map.title}</h3>
        <div className='content'>
            <div id='themap'></div>

            {!deviceDetail ? null :
                <div className='lkv-card'>
                    <LKVProcessGraphicCard
                        id={chart.id}
                        imageSrc={`/${chart.image}.png`}
                        pollingIntervalMillis={15000}
                        properties={chart.properties}
                        additionalProperties={chart.propertyPositions}
                        title={chart.name}
                        theme={Theme.Light}
                        adapter={new IoTCentralAdapter(chart.host, authContext.sharableAuthInstance)}
                    />
                    <div className='cardboard-panel'>
                        <div>
                            {progressCommand ? <><ClipLoader size={16} /><span>{RESX.map.detail.firmware.progress}</span></> : (resultCommand ? RESX.map.detail.firmware.success : (errorCommand ? RESX.map.detail.firmware.error : ''))}
                            {progressDiagnostics ? <><ClipLoader size={16} /><span>{RESX.map.detail.diagnostics.progress}</span></> : (resultDiagnostics ? RESX.map.detail.diagnostics.success : (errorDiagnostics ? RESX.map.detail.diagnostics.error : ''))}
                        </div>
                        <button className='btn btn-primary' onClick={() => { setDeviceDetail(null) }}>{RESX.map.detail.cta}</button>
                    </div>
                </div>
            }

            <div className='actions'>
                <div className='action-item'>
                    <button className='btn-action'>
                        <FontAwesomeIcon icon={Icons.faExclamationCircle} size='4x' />
                        <div>{RESX.map.actions.alerts}</div>
                    </button>
                </div>
                <div className='action-item'>
                    <button className='btn-action'>
                        <FontAwesomeIcon icon={Icons.faClipboardCheck} size='4x' />
                        <div>{RESX.map.actions.inspection}</div>
                    </button>
                </div>
                <div className='action-item'>
                    <button className='btn-action' onClick={() => diagnosticsMode()}>
                        <FontAwesomeIcon icon={Icons.faUserMd} size='4x' />
                        <div>{RESX.map.actions.diagnostics}</div>
                    </button>
                </div>
                <div className='action-item'>
                    <button className='btn-action' onClick={() => updateCommand()}>
                        <FontAwesomeIcon icon={Icons.faRedo} size='4x' />
                        <div>{RESX.map.actions.update}</div>
                    </button>
                </div>
            </div>
        </div>
    </div>

}