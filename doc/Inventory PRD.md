# Product Requirements Document (PRD): Inventory Management System

## 1. Purpose
The Inventory Management System (IMS) centralizes and streamlines stock tracking, order processing, delivery logistics, and financial reconciliation. It provides real-time dashboards, role-based access, and detailed product, order, and rider management to help businesses make informed decisions, enhance operational efficiency, and ensure traceable logistics performance.

## 2. Core Modules & Features

### 2.1 Dashboard
**Overview Panel with live stats:**
- Total Items
- Quantity on Hand
- Inventory Value
- Recent Orders

**Charts & Analytics:**
- Purchase vs. Sales Stock (Bar chart, timeline dropdowns)
- Transactions by Time (Morning/Afternoon/etc.)
- Order Type Summary (Cash, UPI, Card)

### 2.2 Navigation
**Left Navigation Panel**
- Dashboard
- Logistics
    - Orders
    - Runsheet
    - Rider Summary
    - Cash Collection
- Inventory
    - Items
    - Adjustments
    - Pincodes
- Settings

**Top Header**
- Calendar (Filter by date)
- Add Item Button

## 3. Logistics Module

### 3.1 Orders
- **Search & Filters:** By Order ID, Date, Status, Pincode, Shift, Payment Type, Status
- **Order Lifecycle:** Order Placed > Processing > Packed > On the Way > Delivered/Cancelled
- **Bulk Operations:** Assign to Packer, Multiple Print Bills
- **Order Detail View:** Cancel, Print Bill, Add Items, View Payments, View Delivery Slot

### 3.2 Runsheets
- **Creation:** Assign orders to riders; support barcode scanning
- **Status:** Pending / Active / Closed
- **Details View:** Orders assigned, Rider details, Delivery Status

### 3.3 Rider Summary
- **Table View:** Contact, Email, Performance (Deliveries, OFD, Conversion Rate)
- **Onboarding Workflow:** Add/Verify/Approve riders
- **Rider Profile:** Personal Info, Address, References, KYC, Bank Details

### 3.4 Cash Collection
- **Views:** Cash Pending, Receivable
- **Collection Workflow:**
    - View Runsheet
    - Close Runsheet (QR/Cash inputs)
    - Status update
- **Export Option:** .xlsx download

## 4. Inventory Module

### 4.1 Item Management
- **Item List View:** Search, Filters (Stock, Category, Sub-category, Expired)
- **Add/Edit Item:**
    - Category, Sub-category
    - Name, Tags, Description
    - Images (up to 3)
    - Stock Quantity, Unit
    - Prices: Purchase/Sale/Compare/Discount
    - Set Limits (Min/Max/Alert)
    - B2C details

### 4.2 Variant Management
- **Add Variant Workflow:**
    - Select Attribute (Weight, Size)
    - Define Values (e.g., 1kg, 500gms)
    - Set Prices, Stock, Status, Expiry, Images

### 4.3 Inventory Adjustments
- **New Adjustment:**
    - Reason: Procure, Correction, Damage
    - Select Location (Cold Storage, Atmakur, etc.)
    - Add Items: Code, Stock, Qty to Adjust, Prices

## 5. Pincode Management

### 5.1 Pincode List
- **Fields:** Pincode, Status, Delivery Types, Shifts, Slots
- **Filters:** Active/Inactive, Same Day, Next Day

### 5.2 View/Edit Pincode
- **Editable Fields:** Pincode Number, Delivery Types, Shifts
- **Shift Setup:** Shift Name, Slot Times (Add/Remove)
- **Status Toggle:** Activate/Deactivate with confirmation

### 5.3 Add Pincode
- **Form Fields:**
    - Pincode Number
    - Delivery Types
    - Shifts: Name, Time Slots
- **Save Validation:** Requires all fields

## 6. Settings Module

### 6.1 RBAC
- **Stats:** Users, Roles, Groups, Policies, Permissions
- **User Creation:** Add details, assign group/role, review & confirm
- **Group & Role Management:**
    - Create Groups
    - Attach Roles & Policies
    - Toggle User Status (Active/Inactive)

### 6.2 Other Settings (Placeholders)
- Category Management
- Unit Management
- Location Management
- Adjustment Reason Management

## 7. Integration Points
- Barcode Scanner for Runsheet assignment
- PDF Generation for invoice and document downloads
- Excel Export for Cash & Inventory Reports
- KYC Document Preview & Approval
- Real-Time Toggle Sync (Rider/Item/Pincode status updates)

## 8. Roles & Access
- Super Admin
- Admin
- Inventory Manager
- Packer
- Rider
- Viewer

Role-based actions like assigning orders, managing inventory, viewing dashboards, and collecting cash are gated through the RBAC module.

## 9. Notifications & Alerts
- Low Stock Alerts
- Rider Approval Status
- Payment Status Changes (COD to Paid)
- Order Lifecycle Transitions

## 10. Mobile-First Considerations
While the system is desktop-optimized, core features such as order details, runsheet viewing, and cash collection are mobile-compatible, particularly for riders and packers.

## 11. Reporting & Exports
- Inventory Summary
- Delivery Performance
- Order Fulfillment Rates
- Rider Cash Reconciliation

## 12. Future Scope
- Warehouse Transfer Workflows
- Purchase Order Integration
- Vendor Management
- Mobile App for Riders (Geo-tagging, Realtime status update)
- Batch Upload via Excel for Item Import
