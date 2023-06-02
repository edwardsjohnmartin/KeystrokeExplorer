import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { Main } from './main';

Aurelia
    .register(RouterConfiguration.customize({
        useUrlFragmentHash: false,
    }))
    .app(Main)
    .start();
