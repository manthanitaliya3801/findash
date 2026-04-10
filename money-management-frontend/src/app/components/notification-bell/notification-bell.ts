import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { interval, Subscription } from 'rxjs';

@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-bell.html',
    styleUrls: ['./notification-bell.css']
})
export class NotificationBell implements OnInit, OnDestroy {
    private dataService = inject(DataService);
    private pollSub?: Subscription;

    isOpen = false;
    notifications: any[] = [];
    dismissedIds = new Set<string>();

    get unreadCount(): number {
        return this.activeNotifications.length;
    }

    get activeNotifications(): any[] {
        return this.notifications.filter(n => !this.dismissedIds.has(n.id));
    }

    ngOnInit() {
        this.loadNotifications();
        // Poll every 2 minutes
        this.pollSub = interval(120_000).subscribe(() => this.loadNotifications(true));
    }

    ngOnDestroy() {
        this.pollSub?.unsubscribe();
    }

    loadNotifications(force = false) {
        this.dataService.getNotifications(force).subscribe({
            next: (res: any) => {
                this.notifications = res.notifications || [];
            },
            error: (err: any) => console.warn('Notification load error:', err)
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
    }

    dismiss(id: string) {
        this.dismissedIds.add(id);
    }

    dismissAll() {
        this.activeNotifications.forEach(n => this.dismissedIds.add(n.id));
        this.isOpen = false;
    }

    getTypeClass(type: string): string {
        const map: { [key: string]: string } = {
            danger: 'notif-danger',
            warning: 'notif-warning',
            success: 'notif-success',
            info: 'notif-info'
        };
        return map[type] || 'notif-info';
    }

    @HostListener('document:click', ['$event'])
    onDocClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.notification-bell-wrapper')) {
            this.isOpen = false;
        }
    }
}
