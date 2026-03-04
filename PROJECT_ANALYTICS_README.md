# Project Analytics Dashboard

## Overview
A comprehensive analytics dashboard for visualizing project data in both graphical and tabular formats.

## Features

### 📊 Visual Analytics
- **Bar Charts**: Cost breakdowns, material categories, labor types, equipment types
- **Pie Charts**: Project status distribution, cost proportions by category
- **Interactive Charts**: Hover effects and detailed tooltips

### 📋 Data Tables
- **Project Summary**: Overview of all projects with key metrics
- **Materials Analysis**: Detailed breakdown of materials across projects
- **Labor Analysis**: Complete labor cost and type analysis
- **Equipment Analysis**: Equipment usage and rental cost tracking
- **Comprehensive Project Details**: Full project data in tabular format

### 🎯 Key Metrics
- Total Projects (Completed vs Ongoing)
- Total Investment across all projects
- Material Costs with percentage breakdown
- Labor Costs with percentage breakdown
- Equipment Costs and rental tracking

### 📱 Navigation
- **From Projects Page**: Click the "Analytics" button in the header
- **From Admin Sidebar**: Navigate to "Project Analytics"
- **Back Navigation**: Easy return to projects list

### 🔄 Data Management
- **Real-time Data**: Fetches latest project data from API
- **Refresh Functionality**: Manual data refresh capability
- **Export Options**: Data export functionality (placeholder)
- **Error Handling**: Graceful error handling with retry options

## Technical Implementation

### Components
- **Custom Charts**: Simple, lightweight chart implementations
- **Responsive Tables**: Mobile-friendly data tables
- **Tab Navigation**: Organized content in multiple tabs
- **Loading States**: Proper loading and error states

### Data Processing
- **Analytics Calculation**: Real-time calculation from project data
- **Category Mapping**: Intelligent material categorization
- **Cost Aggregation**: Automatic cost summation across projects
- **Status Tracking**: Project completion status monitoring

### Styling
- **Consistent UI**: Matches existing design system
- **Color Coding**: Intuitive color schemes for different data types
- **Responsive Design**: Works on all screen sizes
- **Interactive Elements**: Hover effects and visual feedback

## Usage

1. **Access**: Navigate to `/projects/analytics` or use the Analytics button on the projects page
2. **Overview Tab**: View high-level metrics and cost breakdowns
3. **Materials Tab**: Analyze material usage and costs by category
4. **Labor Tab**: Review labor costs and types across projects
5. **Equipment Tab**: Track equipment usage and rental costs
6. **Projects Tab**: Compare individual project performance

## Data Sources
- Project API endpoint (`/api/project`)
- Real-time data fetching with client ID authentication
- Fallback client ID for development/testing

## Future Enhancements
- Advanced filtering and date range selection
- Export to PDF/Excel functionality
- Real-time data updates
- Advanced chart types (line charts, area charts)
- Drill-down capabilities for detailed analysis