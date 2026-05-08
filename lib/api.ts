import type { Location, Stock } from "@/lib/types"

export type ApiError = {
  status: number
  message: string
}

export type LoginResponse = {
  message: string
  tokens?: {
    access_token: string
    refresh_token: string
  }
}

export type MyRolesResponse = {
  roles: Array<{
    id: number
    name: string
    description: string
    group_name: string
    required_group_id: number
    is_active: boolean
    is_system_role: boolean
    approval_priority: number
    is_location_based: boolean
    location_group_template: string
    created_at: string
  }>
  assignments: Array<{
    assignment_id: number
    role: { id: number; name: string; is_location_based: boolean }
    location: { id: string; name: string } | null
    assigned_at: string
    reason: string
  }>
}

export type MyPermissionsResponse = {
  permissions: string[]
  permission_details: Array<{
    id: number
    name: string
    codename: string
    content_type: number
  }>
}

export type RbacPermission = {
  id: number
  name: string
  content_type: number
}

export type RbacGroup = {
  id: number
  name: string
  user_count: number
  permissions: RbacPermission[]
}

export type RbacUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  is_active: boolean
}

export type ApiCartItem = {
  id: string
  product: string
  quantity: number
  unit_price: string
  part_number: string
  part_name: string
}

export type ApiCart = {
  id: string
  customer_name: string
  is_paid: boolean
  is_checked_out: boolean
  checked_out_at: string | null
  created_at: string
  updated_at: string
  items: ApiCartItem[]
}

export type ApiStock = {
  id: string
  part_number: string
  part_name: string
  price: number | null
  display_balance: number
  location_detail?: {
    id: string
    location: string
    parent?: string | null
  }
}

export type ApiPurchase = {
  id: number
  name: string
  part_number: string
  location: string
  price: number | null
  quantity: number
  is_new_product: boolean
  stock: string | null
  status: "pending" | "approved" | "confirmed" | "failed"
  created_at: string
  updated_at: string
}

export type ApiPurchaseListItem = {
  id: number
  name: string
  part_number: string
  location: string
  location_details: {
    id: number
    location: string
  }
  quantity: number
  price: number | null
  total_amount: string
  status: "pending" | "approved" | "confirmed" | "failed"
  created_by: number
  created_by_name: string
  created_at: string
  approval_progress: number
  current_step: number | null
}

export type ApiApprovalStep = {
  id: number
  sequence: number
  status: "pending" | "confirmed" | "failed"
  reason: string | null
  approved_at: string | null
  approved_by: number | null
  approved_by_details: {
    id: number
    username: string
    email: string
    full_name: string
  } | null
  required_permission: string
}

export type ApiPurchaseDetail = {
  id: number
  name: string
  part_number: string
  location: number
  location_details: {
    id: number
    location: string
  }
  price: number | null
  quantity: number
  total_amount: string
  is_new_product: boolean
  stock: string | null
  status: "pending" | "approved" | "confirmed" | "failed"
  created_by: number
  created_by_details: {
    id: number
    username: string
    email: string
    full_name: string
  }
  created_at: string
  updated_at: string
  approvals: ApiApprovalStep[]
  approval_progress: number
  current_step_number: number | null
  current_required_permission: string | null
  can_current_user_approve: boolean
  can_current_user_reject: boolean
}

export type ApiApproveResponse = {
  message: string
  purchase_id: number
  status: string
  current_step: number | null
  approval_progress: number
  approvals: ApiApprovalStep[]
}

export type ApiRejectResponse = {
  message: string
  purchase_id: number
  status: string
  reason: string
}

export type ApiSalesApprovalStep = {
  id: number
  sequence: number
  status: "pending" | "confirmed" | "failed"
  reason: string | null
  approved_at: string | null
  approved_by: number | null
  approved_by_details: {
    id: number
    username: string
    email: string
    full_name: string
  } | null
  required_permission: string
}

export type ApiSalesItem = {
  id: string
  product: string | null
  part_name: string
  part_number: string
  quantity: number
  unit_price: number
  total_price: number
  status: "pending" | "approved" | "rejected"
  approvals: ApiSalesApprovalStep[]
  created_at: string
}

export type ApiSalesApprovalChainItem = {
  step: number
  required_permission?: string
  status: "pending" | "confirmed" | "failed"
  is_blocked: boolean
  can_approve: boolean
  approved_by: { id: number; username: string; full_name: string } | null
  approved_at: string | null
  reason: string | null
}

export type ApiSalesApprovalStatusResponse = {
  sales_item_id: string
  status: "pending" | "approved" | "rejected"
  progress_percentage: number
  current_step: number | null
  current_required_permission: string | null
  total_amount: number
  created_at: string
  approval_chain: ApiSalesApprovalChainItem[]
  can_approve: boolean
  can_reject: boolean
}

export type ApiSalesApproveResponse = {
  message: string
  sales_item_id: string
  status: string
  current_step: number | null
  approval_progress: number
  approvals: ApiSalesApprovalStep[]
}

export type ApiSalesRejectResponse = {
  message: string
  sales_item_id: string
  status: string
  reason: string
}

export type ApiLocation = {
  id: string
  parent: string | null
  location: string
  children?: ApiLocation[]
}

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base
  const p = path.startsWith("/") ? path : `/${path}`
  return `${b}${p}`
}

async function requestJson<T>(opts: {
  baseUrl: string
  path: string
  method: "GET" | "POST" | "PATCH" | "DELETE"
  token?: string
  body?: unknown
}): Promise<T> {
  const url = joinUrl(opts.baseUrl, opts.path)
  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body == null ? undefined : JSON.stringify(opts.body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const message = text || res.statusText || "Request failed"
    throw { status: res.status, message } satisfies ApiError
  }

  return (await res.json()) as T
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_GENOK_API_BASE_URL ?? ""
}

export async function apiLogin(baseUrl: string, payload: { email: string; password: string }) {
  return requestJson<LoginResponse>({ baseUrl, method: "POST", path: "/auth/login/", body: payload })
}

export async function apiGetMyRoles(baseUrl: string, token: string) {
  return requestJson<MyRolesResponse>({ baseUrl, method: "GET", path: "/roles/assignments/my-roles/", token })
}

export async function apiGetMyPermissions(baseUrl: string, token: string) {
  return requestJson<MyPermissionsResponse>({ baseUrl, method: "GET", path: "/roles/assignments/my-permissions/", token })
}

export async function apiListGroups(baseUrl: string, token: string) {
  return requestJson<RbacGroup[]>({ baseUrl, method: "GET", path: "/roles/groups/", token })
}

export async function apiCreateGroup(baseUrl: string, token: string, payload: { name: string }) {
  return requestJson<RbacGroup>({ baseUrl, method: "POST", path: "/roles/groups/", token, body: payload })
}

export async function apiGetGroup(baseUrl: string, token: string, groupId: number) {
  return requestJson<RbacGroup>({ baseUrl, method: "GET", path: `/roles/groups/${encodeURIComponent(String(groupId))}/`, token })
}

export async function apiGetGroupUsers(baseUrl: string, token: string, groupId: number) {
  return requestJson<RbacUser[]>({ baseUrl, method: "GET", path: `/roles/groups/${encodeURIComponent(String(groupId))}/users/`, token })
}

export async function apiAddUsersToGroup(baseUrl: string, token: string, groupId: number, userIds: number[]) {
  return requestJson<unknown>({
    baseUrl,
    method: "POST",
    path: `/roles/groups/${encodeURIComponent(String(groupId))}/add-users/`,
    token,
    body: { user_ids: userIds },
  })
}

export async function apiRemoveUsersFromGroup(baseUrl: string, token: string, groupId: number, userIds: number[]) {
  return requestJson<unknown>({
    baseUrl,
    method: "POST",
    path: `/roles/groups/${encodeURIComponent(String(groupId))}/remove-users/`,
    token,
    body: { user_ids: userIds },
  })
}

export async function apiGetGroupPermissions(baseUrl: string, token: string, groupId: number) {
  return requestJson<RbacPermission[]>({
    baseUrl,
    method: "GET",
    path: `/roles/groups/${encodeURIComponent(String(groupId))}/permissions/`,
    token,
  })
}

export async function apiAddPermissionsToGroup(baseUrl: string, token: string, groupId: number, permissionIds: number[]) {
  return requestJson<unknown>({
    baseUrl,
    method: "POST",
    path: `/roles/groups/${encodeURIComponent(String(groupId))}/add-permissions/`,
    token,
    body: { permission_ids: permissionIds },
  })
}

export async function apiRemovePermissionsFromGroup(baseUrl: string, token: string, groupId: number, permissionIds: number[]) {
  return requestJson<unknown>({
    baseUrl,
    method: "POST",
    path: `/roles/groups/${encodeURIComponent(String(groupId))}/remove-permissions/`,
    token,
    body: { permission_ids: permissionIds },
  })
}

export async function apiSearchUsers(baseUrl: string, token: string, q: string) {
  return requestJson<RbacUser[]>({
    baseUrl,
    method: "GET",
    path: `/roles/users/?search=${encodeURIComponent(q)}`,
    token,
  })
}

export async function apiSearchPermissions(baseUrl: string, token: string, q: string) {
  return requestJson<RbacPermission[]>({
    baseUrl,
    method: "GET",
    path: `/roles/permissions/search/?q=${encodeURIComponent(q)}`,
    token,
  })
}

export async function apiListPermissions(baseUrl: string, token: string) {
  const data = await requestJson<unknown>({ baseUrl, method: "GET", path: "/roles/permissions/", token })

  if (Array.isArray(data)) return data as RbacPermission[]

  if (typeof data === "object" && data != null && "results" in data) {
    const obj = data as Record<string, unknown>
    const results = obj.results
    if (Array.isArray(results)) return results as RbacPermission[]
  }

  return [] as RbacPermission[]
}

export async function apiCreateLocation(baseUrl: string, token: string | undefined, payload: Omit<Location, "id">) {
  return requestJson<Location>({ baseUrl, method: "POST", path: "/product/location/create/", token, body: payload })
}

export async function apiListLocations(baseUrl: string, token: string, q?: string) {
  const suffix = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
  return requestJson<ApiLocation[]>({ baseUrl, method: "GET", path: `/product/location/${suffix}`, token })
}

export async function apiUpdateLocation(baseUrl: string, token: string, id: string, patch: { location?: string; parent?: string | null }) {
  return requestJson<ApiLocation>({
    baseUrl,
    method: "PATCH",
    path: `/product/location/${encodeURIComponent(id)}/`,
    token,
    body: patch,
  })
}

export async function apiDeleteLocation(baseUrl: string, token: string, id: string) {
  return requestJson<unknown>({ baseUrl, method: "DELETE", path: `/product/location/${encodeURIComponent(id)}/`, token })
}

export async function apiCreateStock(baseUrl: string, token: string | undefined, payload: Omit<Stock, "id">) {
  return requestJson<Stock>({ baseUrl, method: "POST", path: "/product/stock/create/", token, body: payload })
}

export async function apiUpdateStock(baseUrl: string, token: string | undefined, id: string, patch: Partial<Stock>) {
  return requestJson<Stock>({ baseUrl, method: "PATCH", path: `/product/stock/${encodeURIComponent(id)}/`, token, body: patch })
}

export async function apiSearchStock(baseUrl: string, token: string, q: string) {
  const data = await requestJson<unknown>({
    baseUrl,
    method: "GET",
    path: `/product/stock/?q=${encodeURIComponent(q)}`,
    token,
  })

  if (Array.isArray(data)) return data as ApiStock[]
  if (typeof data === "object" && data != null && "results" in data) {
    const obj = data as Record<string, unknown>
    const results = obj.results
    if (Array.isArray(results)) return results as ApiStock[]
  }
  return [] as ApiStock[]
}

export async function apiListStock(baseUrl: string, token: string) {
  const data = await requestJson<unknown>({ baseUrl, method: "GET", path: "/product/stock/", token })
  if (Array.isArray(data)) return data as ApiStock[]
  if (typeof data === "object" && data != null && "results" in data) {
    const obj = data as Record<string, unknown>
    const results = obj.results
    if (Array.isArray(results)) return results as ApiStock[]
  }
  return [] as ApiStock[]
}

export async function apiCreatePurchase(baseUrl: string, token: string, payload: {
  name: string
  part_number: string
  location: string
  price: number | null
  quantity: number
  is_new_product: boolean
  stock?: string | null
}) {
  return requestJson<ApiPurchase>({ baseUrl, method: "POST", path: "/purchases/purchases/", token, body: payload })
}

export async function apiListMyCarts(baseUrl: string, token: string) {
  return requestJson<ApiCart[]>({ baseUrl, method: "GET", path: "/cart/my/", token })
}

export async function apiCreateCart(baseUrl: string, token: string, customerName: string) {
  return requestJson<ApiCart>({ baseUrl, method: "POST", path: "/cart/create/", token, body: { customer_name: customerName } })
}

export async function apiGetCart(baseUrl: string, token: string, cartId: string) {
  return requestJson<ApiCart>({ baseUrl, method: "GET", path: `/cart/${encodeURIComponent(cartId)}/`, token })
}

export async function apiUpdateCart(baseUrl: string, token: string, cartId: string, patch: { customer_name?: string }) {
  return requestJson<ApiCart>({ baseUrl, method: "PATCH", path: `/cart/${encodeURIComponent(cartId)}/update/`, token, body: patch })
}

export async function apiDeleteCart(baseUrl: string, token: string, cartId: string) {
  return requestJson<unknown>({ baseUrl, method: "DELETE", path: `/cart/${encodeURIComponent(cartId)}/delete/`, token })
}

export async function apiAddItemToCart(baseUrl: string, token: string, cartId: string, payload: { product: string; quantity: number; unit_price: number }) {
  return requestJson<ApiCartItem>({ baseUrl, method: "POST", path: `/cart/${encodeURIComponent(cartId)}/items/add/`, token, body: payload })
}

export async function apiUpdateCartItem(baseUrl: string, token: string, itemId: string, patch: { quantity?: number; unit_price?: number }) {
  return requestJson<ApiCartItem>({ baseUrl, method: "PATCH", path: `/cart/items/${encodeURIComponent(itemId)}/update/`, token, body: patch })
}

export async function apiRemoveCartItem(baseUrl: string, token: string, itemId: string) {
  return requestJson<unknown>({ baseUrl, method: "DELETE", path: `/cart/items/${encodeURIComponent(itemId)}/`, token })
}

export async function apiCheckoutCart(baseUrl: string, token: string, cartId: string) {
  return requestJson<ApiCart>({ baseUrl, method: "POST", path: `/cart/${encodeURIComponent(cartId)}/checkout/`, token })
}

export async function apiListPendingApprovals(baseUrl: string, token: string) {
  return requestJson<ApiPurchaseListItem[]>({ baseUrl, method: "GET", path: "/purchases/purchases/pending-approvals/", token })
}

export async function apiListMyPurchases(baseUrl: string, token: string, status?: string) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : ""
  return requestJson<ApiPurchaseListItem[]>({ baseUrl, method: "GET", path: `/purchases/purchases/my-purchases/${suffix}`, token })
}

export async function apiGetPurchaseDetail(baseUrl: string, token: string, purchaseId: number) {
  return requestJson<ApiPurchaseDetail>({ baseUrl, method: "GET", path: `/purchases/purchases/${encodeURIComponent(String(purchaseId))}/`, token })
}

export async function apiApprovePurchase(baseUrl: string, token: string, purchaseId: number, reason?: string) {
  return requestJson<ApiApproveResponse>({
    baseUrl,
    method: "POST",
    path: `/purchases/purchases/${encodeURIComponent(String(purchaseId))}/approve/`,
    token,
    body: reason ? { reason } : {},
  })
}

export async function apiRejectPurchase(baseUrl: string, token: string, purchaseId: number, reason: string) {
  return requestJson<ApiRejectResponse>({
    baseUrl,
    method: "POST",
    path: `/purchases/purchases/${encodeURIComponent(String(purchaseId))}/reject/`,
    token,
    body: { reason },
  })
}

export async function apiListPendingSalesApprovals(baseUrl: string, token: string) {
  return requestJson<ApiSalesItem[]>({ baseUrl, method: "GET", path: "/purchases/sales-items/pending-approvals/", token })
}

export async function apiListMySalesItems(baseUrl: string, token: string) {
  return requestJson<ApiSalesItem[]>({ baseUrl, method: "GET", path: "/purchases/sales-items/my-sales/", token })
}

export async function apiGetSalesItem(baseUrl: string, token: string, salesItemId: string) {
  return requestJson<ApiSalesItem>({
    baseUrl,
    method: "GET",
    path: `/purchases/sales-items/${encodeURIComponent(salesItemId)}/`,
    token,
  })
}

export async function apiGetSalesApprovalStatus(baseUrl: string, token: string, salesItemId: string) {
  return requestJson<ApiSalesApprovalStatusResponse>({
    baseUrl,
    method: "GET",
    path: `/purchases/sales-items/${encodeURIComponent(salesItemId)}/approval-status/`,
    token,
  })
}

export async function apiApproveSalesItem(baseUrl: string, token: string, salesItemId: string, reason?: string) {
  return requestJson<ApiSalesApproveResponse>({
    baseUrl,
    method: "POST",
    path: `/purchases/sales-items/${encodeURIComponent(salesItemId)}/approve/`,
    token,
    body: reason ? { reason } : {},
  })
}

export async function apiRejectSalesItem(baseUrl: string, token: string, salesItemId: string, reason: string) {
  return requestJson<ApiSalesRejectResponse>({
    baseUrl,
    method: "POST",
    path: `/purchases/sales-items/${encodeURIComponent(salesItemId)}/reject/`,
    token,
    body: { reason },
  })
}

