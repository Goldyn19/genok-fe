import type { ActivityItem, AlertItem, Location, Stock } from "@/lib/types"

export const LOCATIONS: Location[] = [
  { id: "loc_a", location: "Warehouse A", parent: null },
  { id: "loc_a_1", location: "Aisle 1", parent: "loc_a" },
  { id: "loc_a_2", location: "Aisle 2", parent: "loc_a" },
  { id: "loc_b", location: "Warehouse B", parent: null },
  { id: "loc_y", location: "Yard Store", parent: null },
]

export const STOCK: Stock[] = [
  {
    id: "stk_01",
    part_name: "Hydraulic Seal Kit",
    part_number: "PN-10021",
    location: "loc_a_1",
    balance: 68,
    price: 42.5,
  },
  {
    id: "stk_02",
    part_name: "Drive Belt 8PK",
    part_number: "PN-22014",
    location: "loc_b",
    balance: 9,
    price: 18,
  },
  {
    id: "stk_03",
    part_name: "Bearing 6205-ZZ",
    part_number: "PN-33007",
    location: "loc_a_2",
    balance: 0,
    price: 3.25,
  },
  {
    id: "stk_04",
    part_name: "Oil Filter (Heavy Duty)",
    part_number: "PN-44090",
    location: "loc_y",
    balance: 31,
    price: 11.75,
  },
  {
    id: "stk_05",
    part_name: "Control Relay 24V",
    part_number: "PN-55110",
    location: "loc_missing",
    balance: 14,
    price: 7.5,
  },
]

export const ALERTS: AlertItem[] = [
  {
    id: "al_1",
    severity: "destructive",
    title: "Low stock: Drive Belt 8PK",
    description: "Balance is below threshold. Review reorder level and create replenishment.",
    ctaLabel: "Open Inventory",
    ctaHref: "/inventory?q=PN-22014",
  },
  {
    id: "al_2",
    severity: "warn",
    title: "Missing location mapping",
    description: "1 stock record references a location that does not exist.",
    ctaLabel: "Filter Inventory",
    ctaHref: "/inventory?q=loc_missing",
  },
]

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "act_1",
    at: "2026-03-23 08:12",
    entity: "stock",
    action: "Updated balance",
    referenceLabel: "PN-44090",
    referenceHref: "/parts/PN-44090",
  },
  {
    id: "act_2",
    at: "2026-03-22 17:40",
    entity: "location",
    action: "Created location",
    referenceLabel: "Aisle 2",
    referenceHref: "/inventory",
  },
  {
    id: "act_3",
    at: "2026-03-22 09:05",
    entity: "stock",
    action: "Created stock entry",
    referenceLabel: "PN-10021",
    referenceHref: "/parts/PN-10021",
  },
]

