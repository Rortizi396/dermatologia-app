// guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
  const isLoggedIn = this.authService.isLoggedIn();
  console.log('AuthGuard - isLoggedIn:', isLoggedIn);
  console.log('AuthGuard - currentUser:', this.authService.currentUserValue);
  
  if (isLoggedIn) {
    return true;
  } else {
    this.router.navigate(['/login']);
    return false;
  }
}
}