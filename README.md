
<div align="center">

# VRChat Friend Network

![preview](./image/main.png)

A web-based application that visualizes your VRChat friends network using interactive D3.js graphs. Easily scan your VRChat photos, generate metadata, and explore connections between players through an intuitive and dynamic interface.

You can only use photos taken while [**VRCX**](https://github.com/vrcx-team/VRCX) is running.

<div align="center">

![preview](./image/help.png)

Also, Only photos taken with the `screenshot helper` **enabled** in VRCX can be used.

<div align="left">

---

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
- [Dependencies](#dependencies)
- [Changelog](#Changelog)
- [License](#license)

## Features

![features](./image/features.png)

- **Interactive Network Graph:** Visualize connections between VRChat players with dynamic force-directed graphs.
- **Search Functionality:** Easily search for players by name and highlight their connections.
- **Responsive Design:** Accessible and functional across various screen sizes.
- **Share and Download** You can download image by SVG or share to the twitter via `tmpfiles`
- **Date Range-based Data Filter** You can filter your pictures by date range using a slider bar.
## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js:** Install Node.js (v14 or later) from [Node.js official website](https://nodejs.org/).
- **npm:** Node.js installation includes npm. Verify installation by running:
  ```bash
  node -v
  npm -v
  ```

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/refiaa/VRChatFriendShipVisualizer.git
   ```
   
2. **Navigate to the Project Directory:**
   ```bash
   cd VRChatFriendShipVisualizer
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

## Setup

1. **Prepare VRChat Images:**

   - Create an `img` folder in the root directory of the project if it doesn't exist, or find path of your VRChat Pictures:
     ```bash
     mkdir img
     ```
  

## Usage

1. **Start the Development Server:**
   ```bash
   npm run dev
   ```

2. **Access the Application:**
   
   - Open your web browser and navigate to [localhost (port:3000)](http://localhost:3000/) to view the VRChat Friend Network Visualization.
   - Place your VRChat photos inside the `./img` folder or Paste the directory path of your VRChat Pictures and click `update directory`. Ensure that the images are in a supported format.
   - And use `Update Visualization` to show Friend Network from your pictures.
   

## Dependencies

The project relies on the following major dependencies:

- **D3.js:** A JavaScript library for producing dynamic, interactive data visualizations in web browsers.
  - **CDN Link:** Included via
    ```js
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
    ```
- **Node.js & Express:** Backend server to handle API requests and serve the frontend.
  - **Note:** Ensure your `package.json` includes necessary scripts and dependencies for running the server.

## Changelog
See [CHANGELOG](CHANGELOG.md) for a list of notable changes and updates.

## License

This project is licensed under the [MIT License](LICENSE).
