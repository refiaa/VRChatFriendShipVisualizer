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

---

## 0.1.0 - 2025-02-03

### New Features
- **EXE Packaging**

- **Backend Enhancements**
  - Changed the metadata storage directory to the user's Pictures folder under `VRChat\metadata` so that metadata JSON files are generated in a familiar and accessible location (e.g., `C:\Users\{username}\Pictures\VRChat\metadata`).
  - Refactored file path and environment variable handling in backend APIs to improve stability and error handling.

### Changes
- Optimized the list of files and dependencies included in the final bundle to exclude unnecessary development files and resources.
- Updated NSIS installer configuration to allow users to change the installation directory and to create shortcuts on the desktop and in the Start Menu.
- Refactored metadata directory initialization to correctly handle existing files versus directories, ensuring that the metadata directory is properly created even in a packaged environment.

### Bugfixes
- Fixed an issue where the metadata directory initialization would fail with an ENOTDIR error by changing the metadata directory to a more appropriate location (under `Pictures\VRChat\metadata`).
- Addressed minor API and UI issues, including proper handling of environment variables and file paths in the backend.
