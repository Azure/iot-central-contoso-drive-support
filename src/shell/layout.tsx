import { AuthContext } from '../context/authContext';
import Authenticated from '../pages/authenticated/authenticated'
import Subauthenticated from '../pages/subauthenticated/subauthenticated'
import React from 'react';

export default function Layout() {
    const authContext: any = React.useContext(AuthContext);
    React.useEffect(() => { authContext.signIn(true); }, [authContext]);
    return authContext.subscription ? <Authenticated /> : <Subauthenticated />
}
