import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private toggleSubject = new Subject<void>();
  readonly toggle$ = this.toggleSubject.asObservable();

  toggle() {
    this.toggleSubject.next();
  }
}
