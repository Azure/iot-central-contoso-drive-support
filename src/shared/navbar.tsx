import './navbar.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from '@fortawesome/free-solid-svg-icons'

import { NavLink } from 'react-router-dom'

export default function NavBar(props: any) {
    const dom: any = [];
    for (let i in props.nav) {
        dom.push(<NavLink key={props.nav[i].link} to={props.nav[i].link} activeClassName='selected'>
            <button title={props.nav[i].title} key={props.nav[i].label} onClick={props.nav[i].action} className='btn btn-nav btn-primary'>
                {props.nav[i].icon ? <div><FontAwesomeIcon icon={Icons[props.nav[i].icon]} /></div> : null}
                <div>{props.nav[i].label}</div>
            </button>
        </NavLink >)
    }
    return <div className='navbar'>{dom}</div>;
}