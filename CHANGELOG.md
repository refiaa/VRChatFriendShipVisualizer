# Changelog

## 0.0.1 - 2024-12-12
### New features
- Basic VRChat friendship visualization functionality
- Metadata generation and processing system
- Network graph visualization (using D3.js)
- Friendship strength-based visualization
- Search and highlight functionality
- SVG export feature
- X(Twitter) share feature
- Directory configuration functionality

### Changes
- Migrated JavaScript backend to TypeScript
- Implemented Express.js based RESTful API

## 0.0.2 - 2024-12-13
### New features
- Added placeholder text for initial page load and no data scenarios
- Improved user guidance with welcome message when first loading the page
- Enhanced empty state handling throughout the visualization process

### Bugfixes
- Corrected event listener timing for search functionality

## 0.0.3 - 2024-12-13
### New features
- Added date range selection using a slider interface

### Changes
- Improved structure of ./public/js directory

### Bugfixes
- Modified backend API to enable filter application even when metadata files exist without internal data

## 0.0.3.1 - 2024-12-13
### Bugfixes
- Fixed an issue where slider values would reset after applying date filter
- Fixed an issue where sliders were still movable when start and end months were the same

## 0.0.3.2 - 2024-12-18
### Changes
- Enhanced node filtering logic to better handle circular references
- Modified network visualization Logic for better performance
- Backend / Frontend Structure Refactored

### Bugfixes
- Fixed search functionality after recent refactoring

## 0.0.3.3 - 2024-12-28
### Changes
- Modified default image directory path to use user's VRChat folder

## 0.0.3.4 - 2024-12-28
### New features
- Added server shutdown functionality
  - Added shutdown server button to UI
  - Implemented clean server shutdown endpoint