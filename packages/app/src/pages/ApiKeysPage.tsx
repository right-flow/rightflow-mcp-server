/**
 * API Keys Management Page
 * MCP API keys for Claude Code/Cowork integration
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { McpSetupInstructions } from '@/components/api-keys/McpSetupInstructions';
import { apiKeysService, type ApiKey, type CreateApiKeyRequest } from '@/services/api-keys/api-keys.service';

export const ApiKeysPage = () => {
  const { getToken } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateApiKeyRequest>({
    name: '',
    description: '',
    environment: 'development',
    permissions: {
      templates: { read: true, write: false },
      fill: true,
      batch: false,
      audit: false,
    },
  });

  // Load API keys on mount
  useEffect(() => {
    loadApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    setError(null);
    const token = await getToken();
    const result = await apiKeysService.listApiKeys(token);

    if (result.success && result.data) {
      setApiKeys(result.data.api_keys);
    } else {
      setError(result.error?.message || 'שגיאה בטעינת מפתחות API');
    }
    setLoading(false);
  };

  const handleCreateApiKey = async () => {
    if (!createFormData.name.trim()) {
      alert('נא להזין שם למפתח');
      return;
    }

    const token = await getToken();
    const result = await apiKeysService.createApiKey(createFormData, token);

    if (result.success && result.data) {
      // Show the API key in a dialog
      setNewlyCreatedKey(result.data.api_key);
      setShowKeyDialog(true);
      setShowCreateDialog(false);

      // Reload API keys list
      await loadApiKeys();

      // Reset form
      setCreateFormData({
        name: '',
        description: '',
        environment: 'development',
        permissions: {
          templates: { read: true, write: false },
          fill: true,
          batch: false,
          audit: false,
        },
      });
    } else {
      alert(`שגיאה ביצירת מפתח: ${result.error?.message || 'שגיאה לא ידועה'}`);
    }
  };

  const handleDeleteApiKey = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המפתח "${name}"?`)) {
      return;
    }

    const token = await getToken();
    const result = await apiKeysService.deleteApiKey(id, token);

    if (result.success) {
      await loadApiKeys();
    } else {
      alert(`שגיאה במחיקת מפתח: ${result.error?.message || 'שגיאה לא ידועה'}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('הועתק ללוח!');
  };

  const getEnvironmentBadge = (env: string) => {
    const colors: Record<string, string> = {
      development: 'bg-blue-100 text-blue-800',
      staging: 'bg-yellow-100 text-yellow-800',
      production: 'bg-red-100 text-red-800',
    };
    return colors[env] || colors.development;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול מפתחות API</h1>
        <p className="text-gray-600">
          מפתחות API למערכת MCP (Model Context Protocol) לשילוב עם Claude Code/Cowork
        </p>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200 p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      <div className="mb-6">
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          + צור מפתח API חדש
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">אין מפתחות API עדיין</p>
          <Button onClick={() => setShowCreateDialog(true)} variant="outline">
            צור מפתח ראשון
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תחילית</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סביבה</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">הרשאות</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">נוצר</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שימוש אחרון</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <tr key={key.id} className={key.revoked_at ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{key.name}</div>
                      {key.description && (
                        <div className="text-sm text-gray-500">{key.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{key.key_prefix}</code>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getEnvironmentBadge(key.environment)}>
                        {key.environment}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        {key.permissions.fill && <div>✓ מילוי PDF</div>}
                        {key.permissions.templates?.read && <div>✓ קריאת תבניות</div>}
                        {key.permissions.templates?.write && <div>✓ כתיבת תבניות</div>}
                        {key.permissions.batch && <div>✓ עיבוד מרובה</div>}
                        {key.permissions.audit && <div>✓ ביקורת</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(key.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {key.last_used_at ? formatDate(key.last_used_at) : 'לא בשימוש'}
                    </td>
                    <td className="px-6 py-4">
                      {key.revoked_at ? (
                        <Badge className="bg-gray-200 text-gray-700">מבוטל</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">פעיל</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!key.revoked_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteApiKey(key.id, key.name)}
                        >
                          מחק
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create API Key Dialog */}
      {showCreateDialog && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md p-6" dir="rtl">
              <h2 className="text-xl font-bold mb-4">יצירת מפתח API חדש</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">שם המפתח *</Label>
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                    placeholder="לדוגמה: Claude Code Key"
                  />
                </div>

                <div>
                  <Label htmlFor="description">תיאור</Label>
                  <Input
                    id="description"
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                    placeholder="תיאור אופציונלי"
                  />
                </div>

                <div>
                  <Label htmlFor="environment">סביבה</Label>
                  <select
                    id="environment"
                    className="w-full border rounded px-3 py-2"
                    value={createFormData.environment}
                    onChange={(e) => setCreateFormData({ ...createFormData, environment: e.target.value as any })}
                  >
                    <option value="development">פיתוח</option>
                    <option value="staging">בדיקות</option>
                    <option value="production">ייצור</option>
                  </select>
                </div>

                <div className="border-t pt-4">
                  <Label>הרשאות</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createFormData.permissions?.fill ?? true}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          permissions: {
                            templates: createFormData.permissions?.templates || { read: true, write: false },
                            fill: e.target.checked,
                            batch: createFormData.permissions?.batch ?? false,
                            audit: createFormData.permissions?.audit ?? false,
                          }
                        })}
                      />
                      <span>מילוי PDF</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createFormData.permissions?.templates?.read ?? true}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          permissions: {
                            templates: {
                              read: e.target.checked,
                              write: createFormData.permissions?.templates?.write ?? false
                            },
                            fill: createFormData.permissions?.fill ?? true,
                            batch: createFormData.permissions?.batch ?? false,
                            audit: createFormData.permissions?.audit ?? false,
                          }
                        })}
                      />
                      <span>קריאת תבניות</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createFormData.permissions?.batch ?? false}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          permissions: {
                            templates: createFormData.permissions?.templates || { read: true, write: false },
                            fill: createFormData.permissions?.fill ?? true,
                            batch: e.target.checked,
                            audit: createFormData.permissions?.audit ?? false,
                          }
                        })}
                      />
                      <span>עיבוד מרובה</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleCreateApiKey} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  צור מפתח
                </Button>
                <Button onClick={() => setShowCreateDialog(false)} variant="outline" className="flex-1">
                  ביטול
                </Button>
              </div>
            </Card>
          </div>
        </Dialog>
      )}

      {/* Show API Key Dialog (one-time display) */}
      {showKeyDialog && newlyCreatedKey && (
        <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl p-6" dir="rtl">
              <h2 className="text-xl font-bold mb-4 text-red-600">⚠️ שמור את המפתח עכשיו!</h2>

              <div className="bg-yellow-50 border-yellow-200 border rounded p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  זוהי ההזדמנות היחידה שלך לראות את המפתח המלא. לא תוכל לראותו שוב!
                </p>
              </div>

              <div className="bg-gray-900 text-white p-4 rounded font-mono text-sm mb-4 relative">
                <code className="break-all">{newlyCreatedKey}</code>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 left-2 bg-gray-800 hover:bg-gray-700"
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                >
                  העתק
                </Button>
              </div>

              <McpSetupInstructions apiKey={newlyCreatedKey} />

              <Button onClick={() => {
                setShowKeyDialog(false);
                setNewlyCreatedKey(null);
              }} className="w-full bg-blue-600 hover:bg-blue-700">
                סגור
              </Button>
            </Card>
          </div>
        </Dialog>
      )}
    </div>
  );
};
