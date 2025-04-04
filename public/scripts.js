/**
 *  scripts.js
 *  Path: ~/FleetAPI_Dev/public
 */

// Replace showToast function with showToast
function showToast(message, type = "success") {
  const backgroundColor = type === "success" ? "#28a745" : "#dc3545";

  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    style: {
      background: backgroundColor,
    },
    stopOnFocus: true,
    close: true,
  }).showToast();
}
// Authentication functions
async function authenticate() {
  window.location.href = "/auth";
}

async function pairKey() {
  window.location.href = "/auth/pairKey";
}

async function refreshToken() {
  try {
    const response = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      showToast("Token refreshed successfully");
      console.log("New access token:", data.access_token);
    } else {
      hideAuthenticatedUI();
      showToast("Failed to refresh token", "danger");
    }
  } catch (error) {
    hideAuthenticatedUI();
    console.error("Error refreshing token:", error);
    showToast("Error refreshing token", "danger");
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
      showToast("Logged out successfully");
    } else {
      showToast("Failed to log out", "danger");
    }
  } catch (error) {
    console.error("Error logging out:", error);
    showToast("Error logging out", "danger");
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
      showToast("Failed to fetch vehicle status", "danger");
    }
  } catch (error) {
    console.error("Error fetching vehicle status:", error);
    showToast("Error fetching vehicle status", "danger");
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

async function VehicleStatus() {
  try {
    const vin = await getFirstVehicleVIN();
    const response = await fetch(`/api/vehicle/status/${vin}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    if (data.response.synced === true) {
      showToast("OOOOOOOOOOOOOOOKKKKKKKKKKKKKKKK");
    } else {
      showToast("Not OK!", "error");
    }
  } catch (error) {
    console.error("Error fetching vehicle status:", error);
    showToast("Error fetching vehicle status", "danger");
  }
}
async function sendVehicleCommand(command) {
  try {
    let params = {};
    const rawParams = command.getAttribute("data-params");
    if (rawParams) {
      try {
        params = JSON.parse(rawParams);
      } catch (error) {
        showToast(error);
      }
    }

    const vin = await getFirstVehicleVIN();
    const response = await fetch("/api/vehicle/commands", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vin: vin,
        command: command.value,
        parameters: params,
      }),
    });

    // const result = await response.json();
    if (response.status === 200) {
      showToast(`Command ${command.value} executed successfully`, "success");
    } else {
      showToast(`Failed to execute command: ${command.value}`, "error");
    }
  } catch (error) {
    console.error("Error sending command:", error);
    showToast(`Failed to execute command: ${command.value}`, "error");
  }
}

// Update getFirstVehicleVIN
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

// To do get fleet status
// To do Telemetry configuration

async function fetchFleetStatus() {
  try {
    const res = await fetch("/api/vehicles/fleetstatus", {
      credentials: "include",
    });
    const vehicles = await res.json();

    let table = `
      <h4>Fleet Status</h4>
      <table class="table table-striped table-hover">
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

async function configureTelemetry() {
  try {
    const vin = await getFirstVehicleVIN();
    const response = await fetch("/api/telemetry/configureTelemetry", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vin }),
    });

    if (response.ok) {
      const result = await response.json();
      showToast("Telemetry configured successfully!", "success");
      console.log("VCP Telemetry Configuration:", result);
    } else {
      showToast("Telemetry configuration failed.", "error");
    }
  } catch (error) {
    console.error("Telemetry Configuration Error:", error);
    showToast("Error configuring telemetry", "error");
  }
}

async function statusTelemetry() {
  try {
    const vin = await getFirstVehicleVIN();
    const response = await fetch(`/api/telemetry/configureStatus/${vin}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    if (data.response.synced === true) {
      showToast("Sycned!");
    } else {
      showToast("Not Synced!", "error");
    }
  } catch (error) {
    console.log(error);
  }
}

async function errorTelemetry() {
  try {
    const vin = await getFirstVehicleVIN();
    const response = await fetch(`/api/telemetry/configureErrors/${vin}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    console.log(data);
    // if (data.response.synced === true) {
    //   showToast("Sycned!");
    // } else {
    //   showToast("Not Synced!", "error");
    // }
  } catch (error) {
    console.log(error);
  }
}

async function configureDelete() {
  try {
    const vin = await getFirstVehicleVIN();
    const response = await fetch(`/api/telemetry/configureDelete/${vin}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json();
    if (data.response.synced === true) {
      showToast("Deleted!");
    } else {
      showToast("Not Synced!", "error");
    }
  } catch (error) {
    console.log(error);
  }
}
