import * as React from 'react';

import { AuthContext } from '../context/authContext';
import { DataContext } from '../context/dataContext';

const useDesired = (payload: any) => {

    const authContext: any = React.useContext(AuthContext);
    const dataContext: any = React.useContext(DataContext);

    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<any>(null);
    const [error, setError] = React.useState<any>(null);

    const setDesired = async () => {
        setLoading(true);
        setData(null);
        setError(null);
        try {
            const token = await authContext.getCentralAccessToken();
            if (!payload.host || !payload.id) { setError(false); return; }
            const res = await dataContext.sendDesired(payload.host, payload.id, payload.body, token);
            setData(res);
            setTimeout(() => {
                setData(null);
            }, 5000);
        } catch (error) {
            setError(error);
            setTimeout(() => {
                setError(null);
            }, 5000);
        }
        setLoading(false);
    };

    return [loading, data, error, setDesired];
};

export default useDesired