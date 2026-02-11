/**
 * Icon Mapping Utility
 * Maps field types, features, and Lucide icons to Material Symbol names
 * @see https://fonts.google.com/icons?icon.set=Material+Symbols
 */

// Field type to Material Symbol mapping
export const FIELD_TYPE_ICONS: Record<string, string> = {
  text: 'edit_note',
  password: 'lock',
  number: 'tag',
  email: 'mail',
  phone: 'phone_iphone',
  date: 'calendar_today',
  time: 'schedule',
  datetime: 'event',
  textarea: 'article',
  dropdown: 'arrow_drop_down',
  radio: 'radio_button_checked',
  checkbox: 'check_box',
  file: 'attach_file',
  signature: 'draw',
  heading: 'title',
  divider: 'horizontal_rule',
};

// Template icons mapping
export const TEMPLATE_ICONS: Record<string, string> = {
  contact: 'edit_note',
  survey: 'analytics',
  registration: 'assignment',
  feedback: 'chat',
  application: 'description',
  order: 'shopping_cart',
  booking: 'event_available',
  report: 'summarize',
};

// Status icons mapping
export const STATUS_ICONS: Record<string, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
  pending: 'schedule',
  completed: 'task_alt',
  draft: 'edit',
  published: 'public',
  archived: 'archive',
};

// Action icons mapping
export const ACTION_ICONS: Record<string, string> = {
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  save: 'save',
  cancel: 'close',
  refresh: 'refresh',
  download: 'download',
  upload: 'upload',
  share: 'share',
  copy: 'content_copy',
  paste: 'content_paste',
  undo: 'undo',
  redo: 'redo',
  search: 'search',
  filter: 'filter_list',
  sort: 'sort',
  expand: 'expand_more',
  collapse: 'expand_less',
  menu: 'more_vert',
  settings: 'settings',
  help: 'help',
  logout: 'logout',
  login: 'login',
};

// Navigation icons mapping
export const NAV_ICONS: Record<string, string> = {
  dashboard: 'dashboard',
  forms: 'description',
  templates: 'layers',
  responses: 'forum',
  analytics: 'analytics',
  settings: 'settings',
  users: 'group',
  billing: 'credit_card',
  notifications: 'notifications',
  profile: 'person',
  organization: 'business',
  whatsapp: 'chat',
  reports: 'assessment',
};

// Lucide to Material Symbol mapping (for migration)
export const LUCIDE_TO_MATERIAL: Record<string, string> = {
  // Layout
  LayoutDashboard: 'dashboard',
  Layout: 'grid_view',
  Grid: 'grid_view',
  List: 'list',

  // Files & Documents
  FileText: 'description',
  File: 'insert_drive_file',
  Files: 'folder',
  Folder: 'folder',
  FolderOpen: 'folder_open',

  // Charts & Analytics
  BarChart3: 'analytics',
  BarChart: 'bar_chart',
  PieChart: 'pie_chart',
  LineChart: 'show_chart',
  TrendingUp: 'trending_up',
  TrendingDown: 'trending_down',
  Activity: 'monitoring',

  // Navigation
  ChevronRight: 'chevron_right',
  ChevronLeft: 'chevron_left',
  ChevronUp: 'expand_less',
  ChevronDown: 'expand_more',
  ArrowRight: 'arrow_forward',
  ArrowLeft: 'arrow_back',
  ArrowUp: 'arrow_upward',
  ArrowDown: 'arrow_downward',
  ExternalLink: 'open_in_new',

  // Actions
  Plus: 'add',
  Minus: 'remove',
  X: 'close',
  Check: 'check',
  Edit: 'edit',
  Edit2: 'edit',
  Trash: 'delete',
  Trash2: 'delete',
  Save: 'save',
  Download: 'download',
  Upload: 'upload',
  Copy: 'content_copy',
  Clipboard: 'content_paste',
  RefreshCw: 'refresh',
  RotateCcw: 'refresh',
  Search: 'search',
  Filter: 'filter_list',
  MoreVertical: 'more_vert',
  MoreHorizontal: 'more_horiz',
  Menu: 'menu',

  // UI Elements
  Bell: 'notifications',
  BellRing: 'notifications_active',
  Settings: 'settings',
  Settings2: 'tune',
  Sliders: 'tune',
  HelpCircle: 'help',
  Info: 'info',
  AlertCircle: 'error',
  AlertTriangle: 'warning',
  CheckCircle: 'check_circle',
  CheckCircle2: 'check_circle',
  XCircle: 'cancel',
  Eye: 'visibility',
  EyeOff: 'visibility_off',
  Lock: 'lock',
  Unlock: 'lock_open',
  Key: 'key',

  // Communication
  Mail: 'mail',
  MessageSquare: 'chat',
  MessageCircle: 'chat_bubble',
  Send: 'send',
  Phone: 'phone',
  Smartphone: 'smartphone',
  Share: 'share',
  Share2: 'share',

  // Users
  User: 'person',
  Users: 'group',
  UserPlus: 'person_add',
  UserMinus: 'person_remove',
  UserCheck: 'how_to_reg',
  UserX: 'person_off',

  // Business
  CreditCard: 'credit_card',
  DollarSign: 'attach_money',
  Briefcase: 'work',
  Building: 'business',
  Building2: 'apartment',

  // Time & Calendar
  Calendar: 'calendar_today',
  CalendarDays: 'calendar_month',
  Clock: 'schedule',
  Timer: 'timer',
  History: 'history',

  // Media
  Image: 'image',
  Camera: 'photo_camera',
  Video: 'videocam',
  Play: 'play_arrow',
  Pause: 'pause',
  Square: 'stop',

  // Theme
  Sun: 'light_mode',
  Moon: 'dark_mode',
  Palette: 'palette',

  // Misc
  Star: 'star',
  Heart: 'favorite',
  Bookmark: 'bookmark',
  Flag: 'flag',
  Zap: 'bolt',
  Sparkles: 'auto_awesome',
  Gift: 'card_giftcard',
  Target: 'my_location',
  Award: 'military_tech',
  Crown: 'workspace_premium',
  Layers: 'layers',
  Package: 'inventory_2',
  Box: 'package_2',
  Archive: 'archive',
  Inbox: 'inbox',
  Paperclip: 'attach_file',
  Link: 'link',
  Globe: 'public',
  MapPin: 'location_on',
  Navigation: 'navigation',
  Compass: 'explore',
  Home: 'home',
  LogOut: 'logout',
  LogIn: 'login',
  Power: 'power_settings_new',
  Terminal: 'terminal',
  Code: 'code',
  Braces: 'data_object',
  Hash: 'tag',
  AtSign: 'alternate_email',
  Percent: 'percent',
};

// Emoji to Material Symbol mapping
export const EMOJI_TO_MATERIAL: Record<string, string> = {
  // Field types
  '📝': 'edit_note',
  '🔒': 'lock',
  '🔢': 'tag',
  '✉️': 'mail',
  '📱': 'phone_iphone',
  '📅': 'calendar_today',
  '⏰': 'schedule',
  '📄': 'article',
  '▼': 'arrow_drop_down',
  '⭕': 'radio_button_checked',
  '⭐': 'radio_button_checked',
  '☑️': 'check_box',
  '📎': 'attach_file',
  '✍️': 'draw',
  '📌': 'push_pin',
  '➖': 'horizontal_rule',

  // Status & Actions
  '🎯': 'my_location',
  '🎉': 'celebration',
  '💡': 'lightbulb',
  '✅': 'check_circle',
  '✓': 'check',
  '❌': 'close',
  '⚠️': 'warning',
  '🔄': 'refresh',
  '⏱': 'timer',
  '📨': 'send',

  // Analytics & Data
  '📊': 'analytics',
  '📋': 'assignment',
  '💬': 'chat',
  '🏢': 'business',
  '🚀': 'rocket_launch',

  // Arrows
  '⬇️': 'arrow_downward',
  '⬆️': 'arrow_upward',
  '⏭️': 'skip_next',
  '↶': 'undo',
};

/**
 * Get Material Symbol name for a field type
 */
export function getFieldIcon(fieldType: string): string {
  return FIELD_TYPE_ICONS[fieldType] || 'help';
}

/**
 * Get Material Symbol name for a template
 */
export function getTemplateIcon(templateType: string): string {
  return TEMPLATE_ICONS[templateType] || 'description';
}

/**
 * Get Material Symbol name for a status
 */
export function getStatusIcon(status: string): string {
  return STATUS_ICONS[status] || 'info';
}

/**
 * Get Material Symbol name from Lucide icon name
 */
export function getLucideEquivalent(lucideIcon: string): string {
  return LUCIDE_TO_MATERIAL[lucideIcon] || 'help';
}

/**
 * Get Material Symbol name from emoji
 */
export function getEmojiEquivalent(emoji: string): string {
  return EMOJI_TO_MATERIAL[emoji] || 'help';
}
