/**
 *  scripts.js
 *  Path: ~/FleetAPI_Dev/public
 */
// Alert handling functions
function showAlert(message, type = "success") {
  const alertElement = document.getElementById("success-alert");
  const messageElement = document.getElementById("alert-message");
  if (alertElement && messageElement) {
    messageElement.innerText = message;
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.style.display = "block";
    setTimeout(() => {
      alertElement.style.display = "none";
    }, 3000);
  }
}

// Authentication functions
async function authenticate() {
  window.location.href = "/auth";
}

async function pairKey() {
  window.location.href = "/pairKey";
}

async function refreshToken() {
  try {
    const response = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      showAlert("Token refreshed successfully");
      console.log("New access token:", data.access_token);
    } else {
      hideAuthenticatedUI();
      showAlert("Failed to refresh token", "danger");
    }
  } catch (error) {
    hideAuthenticatedUI();
    console.error("Error refreshing token:", error);
    showAlert("Error refreshing token", "danger");
  }
}

async function logout() {
  try {
    const response = await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      hideAuthenticatedUI();
      showAlert("Logged out successfully");
    } else {
      showAlert("Failed to log out", "danger");
    }
  } catch (error) {
    console.error("Error logging out:", error);
    showAlert("Error logging out", "danger");
  }
}

// Vehicle status functions
async function fetchVehicleStatus() {
  try {
    const response = await fetch("/api/vehicles", {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      displayVehicleTable(data);
    } else {
      showAlert("Failed to fetch vehicle status", "danger");
    }
  } catch (error) {
    console.error("Error fetching vehicle status:", error);
    showAlert("Error fetching vehicle status", "danger");
  }
}

function displayVehicleTable(vehicles) {
  const vehicleInfoDiv = document.getElementById("vehicle-info");
  let tableHtml = `
            <table class="table table-striped table-hover">
                <thead class="thead-dark">
                    <tr>
                        <th class="align-middle text-center">Vehicle ID</th>
                        <th class="align-middle text-center">VIN</th>
                        <th class="align-middle text-center">Display Name</th>
                        <th class="align-middle text-center">State</th>
                        <th class="align-middle text-center">In Service</th>
                        <th class="align-middle text-center">Calendar Enabled</th>
                        <th class="align-middle text-center">API Version</th>
                        <th class="align-middle text-center">Access Type</th>
                        <th class="align-middle text-center">BLE Autopair Enrolled</th>
                    </tr>
                </thead>
                <tbody>
        `;

  vehicles.forEach((vehicle) => {
    tableHtml += `
                <tr>
                    <td class="align-middle text-center">${vehicle.vehicle_id}</td>
                    <td class="align-middle text-center">${vehicle.vin}</td>
                    <td class="align-middle text-center">${vehicle.display_name}</td>
                    <td class="align-middle text-center">${vehicle.state}</td>
                    <td class="align-middle text-center">${vehicle.in_service}</td>
                    <td class="align-middle text-center">${vehicle.calendar_enabled}</td>
                    <td class="align-middle text-center">${vehicle.api_version}</td>
                    <td class="align-middle text-center">${vehicle.access_type}</td>
                    <td class="align-middle text-center">${vehicle.ble_autopair_enrolled}</td>
                </tr>
            `;
  });

  tableHtml += `
                </tbody>
            </table>
        `;

  vehicleInfoDiv.innerHTML = tableHtml;
}

// Initialize UI on page load
document.addEventListener("DOMContentLoaded", () => {
  if (
    typeof isAuthenticated === "function" &&
    typeof showAuthenticatedUI === "function"
  ) {
    if (isAuthenticated()) {
      showAuthenticatedUI();
      fetchVehicleStatus();
    } else {
      hideAuthenticatedUI();
    }
  } else {
    console.error("Required authentication functions not found");
  }
});

async function sendVehicleCommand(command) {
  try {
    const vin = await getFirstVehicleVIN();
    const response = await fetch("/api/vehicle/commands", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vin: vin,
        command: command,
        parameters: {},
      }),
    });

    const result = await response.json();
    showToast(`Command ${command} executed successfully`);
  } catch (error) {
    console.error("Error sending command:", error);
    showToast(`Failed to execute command: ${command}`, "error");
  }
}

// Update getFirstVehicleVIN to use toast instead of prompt
async function getFirstVehicleVIN() {
  try {
    const res = await fetch("/api/vehicles", { credentials: "include" });
    const data = await res.json();
    if (!data[0]?.vin) {
      showToast("No vehicle detected", "error");
      throw new Error("No vehicle detected");
    }
    return data[0].vin;
  } catch (error) {
    showToast("Error fetching vehicle VIN", "error");
    throw error;
  }
}

// Update configureTelemetry to use toast
async function configureTelemetry() {
  try {
    const vin = await getFirstVehicleVIN();
    const res = await fetch("/api/telemetry/configure", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vin }),
    });
    const data = await res.json();
    console.log("Telemetry configuration response:", data);
    showToast("Telemetry configured successfully");
  } catch (error) {
    console.error("Error configuring telemetry:", error);
    showToast("Failed to configure telemetry", "error");
  }
}

//
function isAuthenticated() {
  // Basic cookie check — you can enhance this later
  return document.cookie.includes("access_token=");
}

function showAuthenticatedUI() {
  document.getElementById("auth-ui").style.display = "block";
}

function hideAuthenticatedUI() {
  document.getElementById("auth-ui").style.display = "none";
}

//
async function fetchFleetStatus() {
  try {
    const res = await fetch("/api/fleetstatus", {
      credentials: "include",
    });
    const vehicles = await res.json();

    let table = `
      <h4>Fleet Status</h4>
      <table class="table table-bordered table-striped">
        <thead>
          <tr>
            <th class="align-middle text-center text-center">VIN</th>
            <th class="align-middle text-center">Paired?</th>
            <th class="align-middle text-center">Firmware</th>
            <th class="align-middle text-center">Command Auth Required</th>
            <th class="align-middle text-center">Telemetry Version</th>
            <th class="align-middle text-center">Discounted Device Data</th>
            <th class="align-middle text-center">Total Keys</th>
          </tr>
        </thead>
        <tbody>
    `;

    vehicles.forEach((v) => {
      const info = v.fleet_status.response || {};
      const isPaired = info.key_paired_vins?.includes(v.vin)
        ? "✅"
        : info.unpaired_vins?.includes(v.vin)
        ? "❌"
        : "Unknown";

      const details = info.vehicle_info?.[v.vin] || {};
      table += `
        <tr>
          <td class="align-middle text-center">${v.vin}</td>
          <td class="align-middle text-center">${isPaired}</td>
          <td class="align-middle text-center">${
            details.firmware_version || "N/A"
          }</td>
          <td class="align-middle text-center">${
            details.vehicle_command_protocol_required ? "✅" : "❌"
          }</td>
          <td class="align-middle text-center">${
            details.fleet_telemetry_version || "N/A"
          }</td>
          <td class="align-middle text-center">${
            details.discounted_device_data ? "✅" : "❌"
          }</td>
          <td class="align-middle text-center">${
            details.total_number_of_keys ?? "N/A"
          }</td>
        </tr>
      `;
    });

    table += `</tbody></table>`;
    document.getElementById("fleet-status").innerHTML = table;
  } catch (err) {
    console.error("Fleet status fetch error:", err);
    document.getElementById(
      "fleet-status"
    ).innerHTML = `<p class="text-danger">Failed to fetch fleet status.</p>`;
  }
}

// Replace showAlert function with showToast
function showToast(message, type = "success") {
  const backgroundColor = type === "success" ? "#28a745" : "#dc3545";

  Toastify({
    text: message,
    duration: 3000,
    gravity: "bottom",
    position: "right",
    backgroundColor: backgroundColor,
    stopOnFocus: true,
    close: true,
  }).showToast();
}
