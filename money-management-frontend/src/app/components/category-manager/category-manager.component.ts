import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="category-manager">
      <div class="category-header">
        <h4>
          <span class="type-badge" [class.income-badge]="type === 'income'" [class.expense-badge]="type === 'expense'">
            {{ type === 'income' ? '💰' : '💸' }}
          </span>
          Manage {{ type === 'income' ? 'Income' : 'Expense' }} Categories
        </h4>
        <button class="close-btn" (click)="close.emit()">✕</button>
      </div>

      <!-- Quick-Add Example Chips -->
      <div class="examples-section">
        <p class="examples-label">
          <i style="font-size:0.7rem; margin-right:3px;">⚡</i>Quick add examples:
        </p>
        <div class="example-chips">
          <button
            *ngFor="let ex of exampleCategories"
            class="example-chip"
            [class.already-added]="isCategoryAdded(ex.name)"
            [title]="isCategoryAdded(ex.name) ? ex.name + ' already added' : 'Click to add ' + ex.name"
            (click)="quickAddCategory(ex.name)"
            [disabled]="isCategoryAdded(ex.name)">
            <span class="chip-icon">{{ ex.icon }}</span>
            <span>{{ ex.name }}</span>
            <span class="chip-check" *ngIf="isCategoryAdded(ex.name)">✓</span>
          </button>
        </div>
      </div>

      <!-- Manual Add Form -->
      <div class="add-category-form">
        <input
          type="text"
          [(ngModel)]="newCategoryName"
          placeholder="Or type a custom category..."
          (keydown.enter)="addCategory()">
        <button (click)="addCategory()" [disabled]="!newCategoryName">Add</button>
      </div>

      <!-- Current Category List -->
      <p class="section-label" *ngIf="categories.length > 0">Your Categories</p>
      <ul class="category-list">
        <li *ngFor="let cat of categories">
          <span>{{ cat.name }}</span>
          <button class="delete-btn" (click)="deleteCategory(cat._id)" title="Remove">🗑️</button>
        </li>
      </ul>

      <p class="empty-note" *ngIf="categories.length === 0">
        No categories yet. Add one above!
      </p>
    </div>
  `,
  styles: [`
    .category-manager {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      width: 100%;
      color: #0f172a;
    }

    /* ── Header ─────────────────────────── */
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .category-header h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .type-badge {
      font-size: 1.1rem;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #64748b;
      line-height: 1;
      padding: 2px;
    }
    .close-btn:hover { color: #ef4444; }

    /* ── Examples ───────────────────────── */
    .examples-section {
      margin-bottom: 12px;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .examples-label {
      margin: 0 0 8px;
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .example-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .example-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1.5px solid #e2e8f0;
      background: white;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.18s ease;
      white-space: nowrap;
    }
    .example-chip:hover:not(:disabled) {
      border-color: #6366f1;
      background: #eef2ff;
      color: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(99,102,241,0.18);
    }
    .example-chip.already-added {
      border-color: #86efac;
      background: #f0fdf4;
      color: #16a34a;
      cursor: default;
      opacity: 0.85;
    }
    .example-chip:disabled {
      cursor: default;
    }
    .chip-icon { font-size: 0.9rem; }
    .chip-check { font-size: 0.7rem; color: #16a34a; font-weight: 700; }

    /* ── Manual Add Form ────────────────── */
    .add-category-form {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .add-category-form input {
      flex: 1;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #f8fafc;
      color: #0f172a;
      font-size: 0.85rem;
    }
    .add-category-form input:focus {
      outline: none;
      border-color: #6366f1;
      background: white;
    }
    .add-category-form button {
      padding: 8px 14px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: background 0.15s;
    }
    .add-category-form button:hover:not(:disabled) { background: #4338ca; }
    .add-category-form button:disabled { opacity: 0.5; cursor: default; }

    /* ── Category List ──────────────────── */
    .section-label {
      margin: 0 0 6px;
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .category-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 180px;
      overflow-y: auto;
    }
    .category-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 2px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .category-list li span {
      color: #1e293b;
      font-size: 0.875rem;
    }
    .delete-btn {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.5;
      font-size: 0.875rem;
      padding: 2px;
      transition: opacity 0.15s;
    }
    .delete-btn:hover { opacity: 1; }

    .empty-note {
      text-align: center;
      color: #94a3b8;
      font-size: 0.8rem;
      padding: 8px 0;
      margin: 0;
    }

    /* ── Dark Mode ─────────────────────── */
    :host-context(.dark-mode) .category-manager,
    :host-context(.dark) .category-manager {
      background: #111b2d;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      color: #e2e8f0;
    }
    :host-context(.dark-mode) .category-header h4,
    :host-context(.dark) .category-header h4 { color: #f1f5f9; }

    :host-context(.dark-mode) .examples-section,
    :host-context(.dark) .examples-section {
      background: #0d1829;
      border-color: #1e3a5f;
    }
    :host-context(.dark-mode) .example-chip,
    :host-context(.dark) .example-chip {
      background: #10213a;
      border-color: #334155;
      color: #94a3b8;
    }
    :host-context(.dark-mode) .example-chip:hover:not(:disabled),
    :host-context(.dark) .example-chip:hover:not(:disabled) {
      background: #1e1b4b;
      border-color: #818cf8;
      color: #a5b4fc;
    }
    :host-context(.dark-mode) .example-chip.already-added,
    :host-context(.dark) .example-chip.already-added {
      background: #052e16;
      border-color: #166534;
      color: #4ade80;
    }

    :host-context(.dark-mode) .add-category-form input,
    :host-context(.dark) .add-category-form input {
      background: #10213a;
      border-color: #334155;
      color: #e2e8f0;
    }
    :host-context(.dark-mode) .add-category-form input::placeholder,
    :host-context(.dark) .add-category-form input::placeholder { color: #64748b; }

    :host-context(.dark-mode) .category-list li,
    :host-context(.dark) .category-list li {
      border-bottom-color: #1e3a5f;
      color: #cbd5e1;
    }
    :host-context(.dark-mode) .category-list li span,
    :host-context(.dark) .category-list li span { color: #cbd5e1; }

    :host-context(.dark-mode) .close-btn,
    :host-context(.dark) .close-btn { color: #94a3b8; }
    :host-context(.dark-mode) .close-btn:hover,
    :host-context(.dark) .close-btn:hover { color: #f87171; }
  `]
})
export class CategoryManager implements OnInit {
  @Input() type: 'income' | 'expense' = 'income';
  @Output() close = new EventEmitter<void>();
  @Output() categoryAdded = new EventEmitter<void>();

  private dataService = inject(DataService);
  categories: any[] = [];
  newCategoryName = '';

  // Example categories shown as chips, context-aware by type
  readonly incomeExamples: { name: string; icon: string }[] = [
    { name: 'Salary', icon: '💼' },
    { name: 'Freelance', icon: '🖥️' },
    { name: 'Business', icon: '🏢' },
    { name: 'Investment', icon: '📈' },
    { name: 'Rental', icon: '🏠' },
    { name: 'Bonus', icon: '🎁' },
    { name: 'Pension', icon: '🧓' },
    { name: 'Side Hustle', icon: '⚡' },
    { name: 'Dividends', icon: '💹' },
    { name: 'Gifts', icon: '🎀' },
  ];

  readonly expenseExamples: { name: string; icon: string }[] = [
    { name: 'Food & Dining', icon: '🍽️' },
    { name: 'Transport', icon: '🚗' },
    { name: 'Rent', icon: '🏠' },
    { name: 'Groceries', icon: '🛒' },
    { name: 'Healthcare', icon: '💊' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Entertainment', icon: '🎬' },
    { name: 'Education', icon: '📚' },
    { name: 'Utilities', icon: '💡' },
    { name: 'Subscriptions', icon: '📱' },
    { name: 'Travel', icon: '✈️' },
    { name: 'Fitness', icon: '🏋️' },
  ];

  get exampleCategories(): { name: string; icon: string }[] {
    return this.type === 'income' ? this.incomeExamples : this.expenseExamples;
  }

  isCategoryAdded(name: string): boolean {
    return this.categories.some(c => c.name.toLowerCase() === name.toLowerCase());
  }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.dataService.getCategories(this.type).subscribe({
      next: (res) => this.categories = res,
      error: (err) => console.error('Error loading categories', err)
    });
  }

  quickAddCategory(name: string) {
    if (this.isCategoryAdded(name)) return;
    this.dataService.addCategory({ name, type: this.type }).subscribe({
      next: () => {
        this.loadCategories();
        this.categoryAdded.emit();
      },
      error: (err) => alert(err.error?.message || 'Error adding category')
    });
  }

  addCategory() {
    if (!this.newCategoryName.trim()) return;
    this.dataService.addCategory({ name: this.newCategoryName, type: this.type }).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.loadCategories();
        this.categoryAdded.emit();
      },
      error: (err) => alert(err.error?.message || 'Error adding category')
    });
  }

  deleteCategory(id: string) {
    if (!confirm('Are you sure?')) return;
    this.dataService.deleteCategory(id).subscribe({
      next: () => {
        this.loadCategories();
        this.categoryAdded.emit();
      },
      error: (err) => console.error('Error deleting category', err)
    });
  }
}
