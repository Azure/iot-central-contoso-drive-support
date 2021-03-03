import './masthead.css';
import { RESX } from '../strings'
import { Styles } from '../shared/styles';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from '@fortawesome/free-solid-svg-icons'

export default function Masthead({ signOutHander, subscriptionName, appCount }: any) {
    return <div className='masthead'>
        <div>
            <div className='title'>{RESX.header.title}</div>
            <div className='sub-title'>{RESX.header.subTitle[0]}{subscriptionName} - {RESX.header.subTitle[1]}{appCount}</div>
        </div>
        <button className='btn btn-link' onClick={signOutHander}>
            <FontAwesomeIcon icon={Icons.faSignOutAlt} color={Styles.brightColor} />
        </button>
    </div>
}
