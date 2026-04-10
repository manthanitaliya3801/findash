import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDataService } from '../../services/admin-data.service';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './users.html',
    styleUrls: ['./users.css']
})
export class AdminUsers implements OnInit {
    private adminDataService = inject(AdminDataService);
    private cdr = inject(ChangeDetectorRef);

    users: any[] = [];
    isLoading = false;
    errorMessage = '';

    // Pagination
    currentPage = 1;
    itemsPerPage = 10;
    totalPages = 1;
    totalUsers = 0;

    constructor() {
        // Constructor initialization if needed
    }

    ngOnInit() {
        this.fetchUsers();
    }

    fetchUsers(forceRefresh = false) {
        this.isLoading = true;
        this.errorMessage = '';

        this.adminDataService.getUsers(this.currentPage, this.itemsPerPage, forceRefresh).subscribe({
            next: (data: any) => {
                this.users = data.users;
                this.totalPages = data.totalPages;
                this.currentPage = data.currentPage;
                this.totalUsers = data.totalUsers;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.isLoading = false;
                if (err.status === 403 || err.status === 401) {
                    this.errorMessage = 'You do not have permission to view users.';
                } else {
                    this.errorMessage = 'Failed to load users. Please try again.';
                }
                console.error('Error fetching users:', err);
                this.cdr.detectChanges();
            }
        });
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.fetchUsers();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.fetchUsers();
        }
    }

    confirmDelete(user: any) {
        if (confirm(`Are you sure you want to remove ${user.name}? This will delete all their data.`)) {
            this.adminDataService.deleteUser(user._id).subscribe({
                next: () => {
                    // Check if we need to go back a page after deletion
                    if (this.users.length === 1 && this.currentPage > 1) {
                        this.currentPage--;
                    }
                    this.fetchUsers(true);
                },
                error: (err) => {
                    alert('Failed to delete user');
                    console.error(err);
                }
            });
        }
    }

    // Alias for template compatibility if needed, or remove if template uses confirmDelete
    deleteUser(userId: string) {
        // Find user object to pass to confirmDelete for better UX
        const user = this.users.find(u => u._id === userId);
        if (user) {
            this.confirmDelete(user);
        }
    }
}
