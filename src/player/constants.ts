/**
 * Tunable numbers and strings for the player domain. Grouped by feature with MARK comments.
 * Prefix names so they still make sense away from the module that uses them.
 */

// MARK: Activity

/**
 * How often an active client may tell the server it saw input.
 * A quiet window sends nothing.
 */
export const ACTIVITY_HEARTBEAT_SECONDS = 5

/**
 * Silence after the last report before the server treats that player as inactive.
 * An active client reports every heartbeat, so this is three quiet windows.
 */
export const ACTIVITY_IDLE_SECONDS = ACTIVITY_HEARTBEAT_SECONDS * 3

/**
 * How far inside the safe-zone edge an inactive player is placed.
 * The spot stays on the line from the ship center through where they were standing.
 */
export const ACTIVITY_RECALL_INSET_METERS = 1

/**
 * Meters above the ship origin an inactive player is placed.
 * The extra height clears the floor.
 */
export const ACTIVITY_RECALL_HEIGHT_METERS = 2
