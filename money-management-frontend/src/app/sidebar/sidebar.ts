import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './sidebar.html',
    styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
    @Input() isAdmin = false;
    @Input() isMobileView = false;
    @Input() showSidebar = true;
    @Input() isSidebarCollapsed = false;

    @Output() logoutEvent = new EventEmitter<void>();
    @Output() openQuickAddEvent = new EventEmitter<void>();

    isMobileMenuOpen = false;

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    closeMobileMenu() {
        this.isMobileMenuOpen = false;
    }

    onLogout() {
        this.isMobileMenuOpen = false;
        this.logoutEvent.emit();
    }

    onOpenQuickAdd() {
        this.openQuickAddEvent.emit();
    }
}
