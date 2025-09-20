import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

export const authGuard = () => {
  const apiService = inject(ApiService);
  const router = inject(Router);

  if (apiService.isAuthenticated()) {
    return true;
  } else {
    router.navigate(['/auth']);
    return false;
  }
};