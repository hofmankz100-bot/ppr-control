"use strict";

const ROLE_PERMISSION_BASE = Object.freeze({
  electrician: "mechanic",
  welder: "mechanic",
  turner: "mechanic",
  forkliftDriver: "mechanic",
  safetyEngineer: "engineer",
  energyEngineer: "engineer",
  designEngineer: "engineer",
  mechanicalEngineer: "engineer",
  instrumentationEngineer: "engineer",
  generalDirector: "productionDirector",
  technicalDirector: "director"
});

const RESOLUTION_EXECUTOR_ROLES = new Set([
  "mechanic",
  "electrician",
  "welder",
  "turner",
  "forkliftDriver"
]);

function createServerPermissions(options = {}) {
  const primaryAdminEmployeeId = String(options.primaryAdminEmployeeId || "").trim();

  function permissionBaseRole(role) {
    const value = String(role || "");
    return ROLE_PERMISSION_BASE[value] || value;
  }

  function isPrimaryAdminEngineer(profile = {}) {
    return Boolean(primaryAdminEmployeeId)
      && String(profile.employeeId || "").trim() === primaryAdminEmployeeId
      && String(profile.role || "") === "editor";
  }

  function engineerPermissionRole(profile = {}) {
    return isPrimaryAdminEngineer(profile) ? "engineer" : permissionBaseRole(profile.role);
  }

  function samePermissionRole(left, right) {
    return permissionBaseRole(left) === permissionBaseRole(right);
  }

  function isResolutionExecutorRole(role) {
    return RESOLUTION_EXECUTOR_ROLES.has(String(role || ""));
  }

  return {
    permissionBaseRole,
    isPrimaryAdminEngineer,
    engineerPermissionRole,
    samePermissionRole,
    isResolutionExecutorRole
  };
}

module.exports = {
  ROLE_PERMISSION_BASE,
  RESOLUTION_EXECUTOR_ROLES,
  createServerPermissions
};
