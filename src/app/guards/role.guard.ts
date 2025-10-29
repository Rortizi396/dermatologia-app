// guards/role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    
    const expectedRoles = next.data['roles'] as Array<string>;
    const user = this.authService.currentUserValue;

    if (user && expectedRoles.includes(user.tipo)) {
      return true;
    }

    // Redirigir a una página de no autorizado o al dashboard
    this.router.navigate(['/unauthorized']);
    return false;
  }
}