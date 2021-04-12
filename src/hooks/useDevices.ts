import * as React from 'react';

import { AuthContext } from '../context/authContext';
import { DataContext } from '../context/dataContext';

const useDevices = (override: boolean) => {

    const authContext: any = React.useContext(AuthContext);
    const dataContext: any = React.useContext(DataContext);

    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<any>(null);
    const [error, setError] = React.useState(null);

    const getDevices = async () => {
        setLoading(true);
        setData(null);
        setError(null);
        try {
            const token = await authContext.getCentralAccessToken();
            await dataContext.getDevices(authContext.centralApps, token, override);
            setData({});
        } catch (error) {
            setError(error);
        }
        setLoading(false);
    };

    return [loading, data, error, getDevices];
};

export default useDevices