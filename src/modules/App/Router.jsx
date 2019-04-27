import React from 'react'
import { Route, Switch } from 'react-router-dom'
import Home from '../Home'
import Filtered from '../Filtered'
import RecentlyAdded from '../RecentlyAdded'
import Profile from '../Profile'
import Dapps from '../Dapps'
import Vote from '../Vote'

export default () => [
  <Switch key={1}>
    <Route exact path="/" component={Home} />
    <Route path="/categories" component={Filtered} />
    <Route path="/all" component={Dapps} />
    <Route path="/recently-added" component={RecentlyAdded} />
    <Route path="/:dapp_name" component={Profile} />
  </Switch>,
  <Vote key={2} />,
]
