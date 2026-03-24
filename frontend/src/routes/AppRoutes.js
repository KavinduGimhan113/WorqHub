/**
 * Route definitions. Use ProtectedRoute for tenant-scoped pages.
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';
import WorkOrders from '../pages/work-orders/WorkOrders';
import WorkOrderForm from '../pages/work-orders/WorkOrderForm';
import Customers from '../pages/customers/Customers';
import CustomerForm from '../pages/customers/CustomerForm';
import Inventory from '../pages/inventory/Inventory';
import InventoryForm from '../pages/inventory/InventoryForm';
import InventoryCategoriesRegister from '../pages/inventory/InventoryCategoriesRegister';
import Billing from '../pages/billing/Billing';
import InvoiceForm from '../pages/billing/InvoiceForm';
import Employees from '../pages/employees/Employees';
import EmployeeForm from '../pages/employees/EmployeeForm';
import Reports from '../pages/reports/Reports';
import Settings from '../pages/settings/Settings';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="work-orders" element={<WorkOrders />} />
        <Route path="work-orders/new" element={<WorkOrderForm />} />
        <Route path="work-orders/:id/edit" element={<WorkOrderForm />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/categories/register" element={<InventoryCategoriesRegister />} />
        <Route path="inventory/new" element={<InventoryForm />} />
        <Route path="inventory/:id/edit" element={<InventoryForm />} />
        <Route path="billing" element={<Billing />} />
        <Route path="billing/new" element={<InvoiceForm />} />
        <Route path="billing/:id/edit" element={<InvoiceForm />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/new" element={<EmployeeForm />} />
        <Route path="employees/:id/edit" element={<EmployeeForm />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
