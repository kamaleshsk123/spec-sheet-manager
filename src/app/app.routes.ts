import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { EditorComponent } from './editor/editor';

export const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'editor', component: EditorComponent },
    { path: 'editor/:id', component: EditorComponent },
];