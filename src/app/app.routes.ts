import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EditorComponent } from './editor/editor';
import { AuthComponent } from './auth/auth.component';
import { authGuard } from './guards/auth.guard';
import { TeamsComponent } from './teams/teams.component';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'auth', component: AuthComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'editor', component: EditorComponent, canActivate: [authGuard] },
    { path: 'editor/:id', component: EditorComponent, canActivate: [authGuard] },
    { path: 'teams', component: TeamsComponent, canActivate: [authGuard] },
];