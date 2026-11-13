import { Routes } from '@angular/router';
import { App } from './app';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: App },
  { path: 'register', component: App },
  { path: 'home', component: App },
  { path: '**', redirectTo: 'login' },
];
