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

export type InviteCreateResponse = {
  token: string
  expires_at: string
  signup_path: string
}

export type InviteValidateResponse = {
  valid: boolean
  email?: string
  expires_at?: string
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

export type RbacRole = {
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
  user_count: number
  assignment_count: number
  created_at: string
}

export type RbacRoleAssignment = {
  id: number
  user: number
  user_email: string
  role: number
  role_name: string
  role_details: RbacRole
  location: string | null
  location_name: string | null
  normalized_location_name: string | null
  assigned_by: number | null
  assigned_by_name: string | null
  assigned_at: string
  is_active: boolean
  reason: string
}

export type RbacRoleDetail = RbacRole & {
  group_permissions: RbacPermission[]
  assignments: Array<{
    id: number
    user: { id: number; username: string; email: string; full_name: string }
    location: { id: string; name: string } | null
    assigned_by: { id: number; username: string } | null
    assigned_at: string
    reason: string
  }>
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
  parent?: string | null
  price: number | null
  is_caterpillar?: boolean
  brand?: string | null
  is_original?: boolean
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
  required_permission_users: Array<{
    id: number
    username: string
    email: string
    full_name: string
  }>
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
  brand?: string | null
  is_caterpillar?: boolean
  is_original?: boolean
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

export type ApiActivityItem = {
  kind: "purchase" | "sale"
  id: string
  created_at: string
  part_name: string
  part_number: string
  quantity: number
  status: string
  location: string
  total: number | null
  created_by_name: string
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

export type ApiMyActionItem = {
  type: "purchase" | "sale"
  approval_id: number
  object_id: number | string
  step: number
  decision: "approved" | "rejected"
  reason: string | null
  acted_at: string | null
  current_status: string
  name: string
  part_number: string
  quantity: number
  can_change_decision: boolean
  blocked_reason: string | null
}

export type ApiRevokeActionResponse = {
  ok: boolean
}

export type ApiCreditCustomer = {
  credit_id: string
  customer_name: string
}

export type ApiCreditTransaction = {
  id: number
  customer: string
  customer_name: string
  sales: number
  amount: number
  created_at: string
}

export type ApiCreditPayment = {
  id: number
  customer: string
  customer_name: string
  amount: number
  paid_at: string
}

export type ApiCreditCustomerDetail = {
  credit_id: string
  customer_name: string
  transactions: ApiCreditTransaction[]
  credit_payments: ApiCreditPayment[]
  total_credit: number
  total_paid: number
  balance: number
}

export type ApiLocation = {
  id: string
  parent: string | null
  location: string
  children?: ApiLocation[]
}

export type ApiLocationImportError = {
  row: number
  error: string
  data: Record<string, unknown>
}

export type ApiLocationImportResult = {
  dry_run: boolean
  total_rows: number
  created: number
  existed: number
  errors: ApiLocationImportError[]
}

export type ApiPurchaseUpdatePayload = {
  name?: string
  part_number?: string
  location?: string
  price?: number | null
  quantity?: number
  brand?: string | null
  is_caterpillar?: boolean
  is_original?: boolean
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

async function requestFormData<T>(opts: {
  baseUrl: string
  path: string
  method: "POST"
  token?: string
  body: FormData
}): Promise<T> {
  const url = joinUrl(opts.baseUrl, opts.path)
  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Accept: "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body,
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

export async function apiCreateSignupInvite(baseUrl: string, token: string, payload: { email: string }) {
  return requestJson<InviteCreateResponse>({ baseUrl, method: "POST", path: "/auth/invites/", token, body: payload })
}

export async function apiValidateSignupInvite(baseUrl: string, inviteToken: string) {
  return requestJson<InviteValidateResponse>({
    baseUrl,
    method: "GET",
    path: `/auth/invites/validate/?token=${encodeURIComponent(inviteToken)}`,
  })
}

export async function apiSignupWithInvite(baseUrl: string, payload: {
  email: string
  password: string
  first_name: string
  last_name: string
  invite_token: string
}) {
  return requestJson<{ message: string; data: { email: string; first_name: string; last_name: string } }>({
    baseUrl,
    method: "POST",
    path: "/auth/signup/",
    body: payload,
  })
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

export async function apiListRoles(baseUrl: string, token: string) {
  return requestJson<RbacRole[]>({ baseUrl, method: "GET", path: "/roles/roles/", token })
}

export async function apiCreateRole(
  baseUrl: string,
  token: string,
  payload: {
    name: string
    description?: string
    approval_priority?: number
    is_location_based?: boolean
    location_group_template?: string
    is_active?: boolean
  }
) {
  return requestJson<RbacRole>({
    baseUrl,
    method: "POST",
    path: "/roles/roles/",
    token,
    body: payload,
  })
}

export async function apiGetRole(baseUrl: string, token: string, roleId: number) {
  return requestJson<RbacRoleDetail>({
    baseUrl,
    method: "GET",
    path: `/roles/roles/${encodeURIComponent(String(roleId))}/`,
    token,
  })
}

export async function apiListRoleAssignments(baseUrl: string, token: string, filters?: { roleId?: number; userId?: number; locationId?: string; isActive?: boolean }) {
  const qs = new URLSearchParams()
  if (filters?.roleId != null) qs.set("role_id", String(filters.roleId))
  if (filters?.userId != null) qs.set("user_id", String(filters.userId))
  if (filters?.locationId) qs.set("location_id", filters.locationId)
  if (filters?.isActive != null) qs.set("is_active", String(filters.isActive))
  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  return requestJson<RbacRoleAssignment[]>({ baseUrl, method: "GET", path: `/roles/assignments/${suffix}`, token })
}

export async function apiCreateRoleAssignment(
  baseUrl: string,
  token: string,
  payload: { user: number; role: number; location?: string | null; reason?: string }
) {
  return requestJson<RbacRoleAssignment>({
    baseUrl,
    method: "POST",
    path: "/roles/assignments/",
    token,
    body: payload,
  })
}

export async function apiDeactivateRoleAssignment(baseUrl: string, token: string, assignmentId: number) {
  return requestJson<unknown>({
    baseUrl,
    method: "POST",
    path: `/roles/assignments/${encodeURIComponent(String(assignmentId))}/deactivate/`,
    token,
    body: {},
  })
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

export async function apiImportLocationsCsv(baseUrl: string, token: string, file: File, opts?: { dry_run?: boolean }) {
  const body = new FormData()
  body.set("file", file)
  if (opts?.dry_run != null) body.set("dry_run", String(opts.dry_run))
  return requestFormData<ApiLocationImportResult>({
    baseUrl,
    method: "POST",
    path: "/product/location/import-csv/",
    token,
    body,
  })
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

export type ApiPaginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

async function requestAllPaginatedRows<T>(opts: {
  baseUrl: string
  token: string
  path: string
  page_size?: number
}) {
  const rows: T[] = []
  const pageSize = opts.page_size ?? 100

  for (let page = 1; page <= 1000; page += 1) {
    const separator = opts.path.includes("?") ? "&" : "?"
    const data = await requestJson<unknown>({
      baseUrl: opts.baseUrl,
      method: "GET",
      path: `${opts.path}${separator}page=${page}&page_size=${pageSize}`,
      token: opts.token,
    })

    if (Array.isArray(data)) return data as T[]

    if (typeof data === "object" && data != null && "results" in data) {
      const paginated = data as ApiPaginated<T>
      rows.push(...paginated.results)

      if (!paginated.next || rows.length >= paginated.count) return rows
      continue
    }

    return rows
  }

  return rows
}

export async function apiListStockPage(
  baseUrl: string,
  token: string,
  opts: { page: number; page_size?: number; q?: string }
) {
  const qs = new URLSearchParams()
  qs.set("page", String(opts.page))
  if (opts.page_size != null) qs.set("page_size", String(opts.page_size))
  if (opts.q && opts.q.trim()) qs.set("q", opts.q.trim())

  const data = await requestJson<unknown>({
    baseUrl,
    method: "GET",
    path: `/product/stock/?${qs.toString()}`,
    token,
  })

  if (typeof data === "object" && data != null && "results" in data) {
    return data as ApiPaginated<ApiStock>
  }

  const rows = Array.isArray(data) ? (data as ApiStock[]) : ([] as ApiStock[])
  return { count: rows.length, next: null, previous: null, results: rows } as ApiPaginated<ApiStock>
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
  parent_stock?: string | null
  brand?: string | null
  is_caterpillar?: boolean
  is_original?: boolean
}) {
  return requestJson<ApiPurchase>({ baseUrl, method: "POST", path: "/purchases/purchases/", token, body: payload })
}

export async function apiUpdatePurchase(
  baseUrl: string,
  token: string,
  purchaseId: number,
  payload: ApiPurchaseUpdatePayload
) {
  return requestJson<ApiPurchaseDetail>({
    baseUrl,
    method: "PATCH",
    path: `/purchases/purchases/${encodeURIComponent(String(purchaseId))}/`,
    token,
    body: payload,
  })
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

export async function apiCheckoutCart(
  baseUrl: string,
  token: string,
  cartId: string,
  payload?: { payment_method: "cash" | "bank_transfer" | "pos" | "credit"; credit_customer_id?: string }
) {
  return requestJson<ApiCart>({
    baseUrl,
    method: "POST",
    path: `/cart/${encodeURIComponent(cartId)}/checkout/`,
    token,
    body: payload ?? {},
  })
}

export async function apiListPendingApprovals(baseUrl: string, token: string) {
  return requestJson<ApiPurchaseListItem[]>({ baseUrl, method: "GET", path: "/purchases/purchases/pending-approvals/", token })
}

export async function apiListPendingApprovalsPage(
  baseUrl: string,
  token: string,
  opts: { page: number; page_size?: number; search?: string }
) {
  const qs = new URLSearchParams()
  qs.set("page", String(opts.page))
  if (opts.page_size != null) qs.set("page_size", String(opts.page_size))
  if (opts.search && opts.search.trim()) qs.set("search", opts.search.trim())

  const data = await requestJson<unknown>({
    baseUrl,
    method: "GET",
    path: `/purchases/purchases/pending-approvals/?${qs.toString()}`,
    token,
  })

  if (typeof data === "object" && data != null && "results" in data) {
    return data as ApiPaginated<ApiPurchaseListItem>
  }

  const rows = Array.isArray(data) ? (data as ApiPurchaseListItem[]) : ([] as ApiPurchaseListItem[])
  return { count: rows.length, next: null, previous: null, results: rows } as ApiPaginated<ApiPurchaseListItem>
}

export async function apiListPurchases(
  baseUrl: string,
  token: string,
  filters?: { status?: string; fromDate?: string; toDate?: string; locationId?: string; createdById?: string; search?: string }
) {
  const qs = new URLSearchParams()
  if (filters?.status) qs.set("status", filters.status)
  if (filters?.fromDate) qs.set("from_date", filters.fromDate)
  if (filters?.toDate) qs.set("to_date", filters.toDate)
  if (filters?.locationId) qs.set("location_id", filters.locationId)
  if (filters?.createdById) qs.set("created_by_id", filters.createdById)
  if (filters?.search) qs.set("search", filters.search)
  const suffix = qs.toString() ? `?${qs.toString()}` : ""

  return requestAllPaginatedRows<ApiPurchaseListItem>({
    baseUrl,
    token,
    path: `/purchases/purchases/${suffix}`,
  })
}

export async function apiListActivityPage(
  baseUrl: string,
  token: string,
  opts: { page: number; page_size?: number; q?: string; fromDate?: string; toDate?: string }
) {
  const qs = new URLSearchParams()
  qs.set("page", String(opts.page))
  if (opts.page_size != null) qs.set("page_size", String(opts.page_size))
  if (opts.q && opts.q.trim()) qs.set("q", opts.q.trim())
  if (opts.fromDate) qs.set("from_date", opts.fromDate)
  if (opts.toDate) qs.set("to_date", opts.toDate)

  return requestJson<ApiPaginated<ApiActivityItem>>({
    baseUrl,
    method: "GET",
    path: `/purchases/activity/?${qs.toString()}`,
    token,
  })
}

export async function apiListMyPurchases(baseUrl: string, token: string, status?: string) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : ""
  return requestJson<ApiPurchaseListItem[]>({ baseUrl, method: "GET", path: `/purchases/purchases/my-purchases/${suffix}`, token })
}

export async function apiListMyPurchasesPage(
  baseUrl: string,
  token: string,
  opts: { page: number; page_size?: number; status?: string; search?: string }
) {
  const qs = new URLSearchParams()
  qs.set("page", String(opts.page))
  if (opts.page_size != null) qs.set("page_size", String(opts.page_size))
  if (opts.status) qs.set("status", opts.status)
  if (opts.search && opts.search.trim()) qs.set("search", opts.search.trim())

  const data = await requestJson<unknown>({
    baseUrl,
    method: "GET",
    path: `/purchases/purchases/my-purchases/?${qs.toString()}`,
    token,
  })

  if (typeof data === "object" && data != null && "results" in data) {
    return data as ApiPaginated<ApiPurchaseListItem>
  }

  const rows = Array.isArray(data) ? (data as ApiPurchaseListItem[]) : ([] as ApiPurchaseListItem[])
  return { count: rows.length, next: null, previous: null, results: rows } as ApiPaginated<ApiPurchaseListItem>
}

export async function apiListMyActionsPage(
  baseUrl: string,
  token: string,
  opts: { page: number; page_size?: number; search?: string }
) {
  const qs = new URLSearchParams()
  qs.set("page", String(opts.page))
  if (opts.page_size != null) qs.set("page_size", String(opts.page_size))
  if (opts.search && opts.search.trim()) qs.set("search", opts.search.trim())

  const data = await requestJson<unknown>({
    baseUrl,
    method: "GET",
    path: `/purchases/purchases/my-actions/?${qs.toString()}`,
    token,
  })

  if (typeof data === "object" && data != null && "results" in data) {
    return data as ApiPaginated<ApiMyActionItem>
  }

  const rows = Array.isArray(data) ? (data as ApiMyActionItem[]) : ([] as ApiMyActionItem[])
  return { count: rows.length, next: null, previous: null, results: rows } as ApiPaginated<ApiMyActionItem>
}

export async function apiRevokeMyAction(
  baseUrl: string,
  token: string,
  body: { type: "purchase" | "sale"; approval_id: number }
) {
  return requestJson<ApiRevokeActionResponse>({
    baseUrl,
    method: "POST",
    path: "/purchases/purchases/revoke-action/",
    token,
    body,
  })
}

export async function apiGetPurchaseDetail(baseUrl: string, token: string, purchaseId: number) {
  return requestJson<ApiPurchaseDetail>({ baseUrl, method: "GET", path: `/purchases/purchases/${encodeURIComponent(String(purchaseId))}/`, token })
}

export async function apiApprovePurchase(
  baseUrl: string,
  token: string,
  purchaseId: number,
  opts?: { reason?: string; location?: string }
) {
  const body: Record<string, string> = {}
  if (opts?.reason) body.reason = opts.reason
  if (opts?.location) body.location = opts.location
  return requestJson<ApiApproveResponse>({
    baseUrl,
    method: "POST",
    path: `/purchases/purchases/${encodeURIComponent(String(purchaseId))}/approve/`,
    token,
    body,
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

export async function apiListSalesItems(baseUrl: string, token: string, filters?: { status?: string; q?: string; partNumber?: string }) {
  const qs = new URLSearchParams()
  if (filters?.status) qs.set("status", filters.status)
  if (filters?.q) qs.set("q", filters.q)
  if (filters?.partNumber) qs.set("part_number", filters.partNumber)
  const suffix = qs.toString() ? `?${qs.toString()}` : ""

  return requestAllPaginatedRows<ApiSalesItem>({
    baseUrl,
    token,
    path: `/purchases/sales-items/${suffix}`,
  })
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

export async function apiListCreditCustomers(baseUrl: string, token: string) {
  return requestJson<ApiCreditCustomer[]>({ baseUrl, method: "GET", path: "/payment/customers/", token })
}

export async function apiCreateCreditCustomer(baseUrl: string, token: string, payload: { customer_name: string }) {
  return requestJson<ApiCreditCustomer>({ baseUrl, method: "POST", path: "/payment/customers/", token, body: payload })
}

export async function apiGetCreditCustomer(baseUrl: string, token: string, creditId: string) {
  return requestJson<ApiCreditCustomerDetail>({
    baseUrl,
    method: "GET",
    path: `/payment/customers/${encodeURIComponent(creditId)}/`,
    token,
  })
}

export async function apiListCreditTransactions(baseUrl: string, token: string, creditId: string) {
  return requestJson<ApiCreditTransaction[]>({
    baseUrl,
    method: "GET",
    path: `/payment/customers/${encodeURIComponent(creditId)}/transactions/`,
    token,
  })
}

export async function apiListCreditPayments(baseUrl: string, token: string, creditId: string) {
  return requestJson<ApiCreditPayment[]>({
    baseUrl,
    method: "GET",
    path: `/payment/customers/${encodeURIComponent(creditId)}/payments/`,
    token,
  })
}

export async function apiCreateCreditPayment(baseUrl: string, token: string, creditId: string, payload: { amount: number }) {
  return requestJson<{ customer: string; amount: number }>({
    baseUrl,
    method: "POST",
    path: `/payment/customers/${encodeURIComponent(creditId)}/payments/`,
    token,
    body: { customer: creditId, amount: payload.amount },
  })
}

