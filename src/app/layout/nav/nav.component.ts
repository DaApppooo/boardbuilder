import {Component, OnInit} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {Observable} from 'rxjs';
import {ToolbarButton, ToolbarService} from '@app/services/toolbar.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {

  canActivateProtectedRoutes: Observable<boolean>;
  leftButtons$: Observable<ToolbarButton[]>;
  rightButtons$: Observable<ToolbarButton[]>;

  constructor(
    private authService: AuthService,
    private toolbarService: ToolbarService
  ) {
    this.canActivateProtectedRoutes = this.authService.canActivateProtectedRoutes$;
  }

  ngOnInit(): void {
    this.leftButtons$ = this.toolbarService.leftButtons$;
    this.rightButtons$ = this.toolbarService.rightButtons$;
  }

  login() { this.authService.login(); }
  logout() { this.authService.logout(); }
  get identityClaims() { return this.authService.identityClaims; }

}
