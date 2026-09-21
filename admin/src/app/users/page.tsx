'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserListItem } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Users, Search, Loader2, UserX, UserCheck, SlidersHorizontal, AlertTriangle, Shield, User, Loader2 as Loader } from 'lucide-react';
import { useState } from 'react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [freezeModal, setFreezeModal] = useState<{ user: UserListItem | null; action: 'freeze' | 'unfreeze' }>({ user: null, action: 'freeze' });
  const [trustScoreModal, setTrustScoreModal] = useState<{ user: UserListItem | null; score: number }>({ user: null, score: 0 });
  const [freezeReason, setFreezeReason] = useState('');
  const [trustScoreReason, setTrustScoreReason] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [trustScoreLoading, setTrustScoreLoading] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getAll(),
  });

  const freezeMutation = useMutation({
    mutationFn: ({ userId, frozen, reason }: { userId: string; frozen: boolean; reason: string }) =>
      usersApi.freeze(userId, { frozen, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setFreezeModal({ user: null, action: 'freeze' });
      setFreezeReason('');
    },
  });

  const trustScoreMutation = useMutation({
    mutationFn: ({ userId, trust_score, reason }: { userId: string; trust_score: number; reason: string }) =>
      usersApi.adjustTrustScore(userId, { trust_score, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setTrustScoreModal({ user: null, score: 0 });
      setTrustScoreReason('');
    },
  });

  const filteredUsers = users
    .filter((u) =>
      u.userId.toLowerCase().includes(search.toLowerCase()) ||
      u.phoneNumber.includes(search)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openFreezeModal = (user: UserListItem, action: 'freeze' | 'unfreeze') => {
    setFreezeModal({ user, action });
    setFreezeReason('');
  };

  const openTrustScoreModal = (user: UserListItem) => {
    setTrustScoreModal({ user, score: user.trustScore });
    setTrustScoreReason('');
  };

  const handleFreeze = async () => {
    if (!freezeModal.user || !freezeReason.trim()) return;
    setFreezeLoading(true);
    await freezeMutation.mutateAsync({
      userId: freezeModal.user.userId,
      frozen: freezeModal.action === 'freeze',
      reason: freezeReason,
    });
    setFreezeLoading(false);
  };

  const handleTrustScore = async () => {
    if (!trustScoreModal.user || !trustScoreReason.trim()) return;
    setTrustScoreLoading(true);
    await trustScoreMutation.mutateAsync({
      userId: trustScoreModal.user.userId,
      trust_score: trustScoreModal.score,
      reason: trustScoreReason,
    });
    setTrustScoreLoading(false);
  };

  return (
    <AdminLayout
      title="User Management"
      subtitle={`${filteredUsers.length} users`}
      headerAction={
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-tertiary" />
          <Input
            placeholder="Search by user ID or phone..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      }
    >
      <Card padding="sheet">
        <CardContent className="space-y-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-ink-primary animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
              <p className="text-body text-ink-secondary">No users found</p>
            </div>
          ) : (
            <Table className="max-h-[600px] overflow-y-auto scrollbar-thin">
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.userId}
                  state={user.isFrozen ? 'danger' : user.trustScore < 30 ? 'caution' : 'secure'}
                >
                  <TableRowMain
                    mark={<User className="w-5 h-5" />}
                    title={user.phoneNumber}
                    subtitle={`ID: ${user.userId.slice(0, 8)} • ${user.role}`}
                    value={user.isFrozen ? 'FROZEN' : 'ACTIVE'}
                    meta={formatDate(user.createdAt)}
                  />
                  <TableRowFoot>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill
                        variant={
                          user.trustScore >= 80 ? 'secure' : user.trustScore >= 50 ? 'caution' : 'danger'
                        }
                        size="trace"
                      >
                        Trust: {user.trustScore}
                      </Pill>
                      <Badge variant={user.kycTier >= 2 ? 'success' : user.kycTier === 1 ? 'info' : 'default'}>
                        KYC Tier {user.kycTier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openFreezeModal(user, user.isFrozen ? 'unfreeze' : 'freeze')}
                      >
                        {user.isFrozen ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Unfreeze
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4" />
                            Freeze
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openTrustScoreModal(user)}>
                        <SlidersHorizontal className="w-4 h-4" />
                        Trust Score
                      </Button>
                    </div>
                  </TableRowFoot>
                </TableRow>
              ))}
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Freeze/Unfreeze Modal */}
      <Modal
        isOpen={!!freezeModal.user}
        onClose={() => setFreezeModal({ user: null, action: 'freeze' })}
        title={freezeModal.action === 'freeze' ? 'Freeze User' : 'Unfreeze User'}
        size="sm"
      >
        <p className="text-body text-ink-secondary mb-4">
          {freezeModal.action === 'freeze'
            ? 'Freezing this user will prevent them from initiating new transactions. Existing escrow funds are not affected.'
            : 'Unfreezing will restore the user\'s ability to create and participate in escrow transactions.'}
        </p>
        <Textarea
          label="Reason (required)"
          value={freezeReason}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFreezeReason(e.target.value)}
          placeholder="Enter reason for this action..."
          rows={3}
          required
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-line-primary">
          <Button variant="ghost" onClick={() => setFreezeModal({ user: null, action: 'freeze' })} disabled={freezeLoading}>
            Cancel
          </Button>
          <Button
            variant={freezeModal.action === 'freeze' ? 'danger' : 'primary'}
            onClick={handleFreeze}
            disabled={freezeLoading || !freezeReason.trim()}
            loading={freezeLoading}
          >
            {freezeModal.action === 'freeze' ? 'Freeze User' : 'Unfreeze User'}
          </Button>
        </div>
      </Modal>

      {/* Trust Score Modal */}
      <Modal
        isOpen={!!trustScoreModal.user}
        onClose={() => setTrustScoreModal({ user: null, score: 0 })}
        title="Adjust Trust Score"
        size="sm"
      >
        <p className="text-body text-ink-secondary mb-4">
          Adjust the user's trust score (0-100). Changes are audit-logged with the provided reason.
        </p>
        <Input
          label="Trust Score"
          type="number"
          min={0}
          max={100}
          value={trustScoreModal.score}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrustScoreModal({ ...trustScoreModal, score: parseInt(e.target.value) || 0 })}
        />
        <Textarea
          label="Reason (required)"
          value={trustScoreReason}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTrustScoreReason(e.target.value)}
          placeholder="Enter reason for trust score adjustment..."
          rows={3}
          required
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-line-primary">
          <Button variant="ghost" onClick={() => setTrustScoreModal({ user: null, score: 0 })} disabled={trustScoreLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleTrustScore} disabled={trustScoreLoading || !trustScoreReason.trim()} loading={trustScoreLoading}>
            Update Trust Score
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}