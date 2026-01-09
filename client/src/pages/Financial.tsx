import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useLeads } from "@/hooks/use-leads";
import { addMonths, format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  RefreshCw,
  Plus,
  Percent,
  Clock,
  FileText,
  Wallet,
  PiggyBank,
  Landmark,
  Megaphone
} from "lucide-react";
import type { Account, Invoice, InternalLoan, VendorPayable } from "@shared/schema";

interface FinancialSummary {
  currentCash: number;
  totalAR: number;
  totalOverdue: number;
  totalInterestOwed: number;
  totalAP: number;
  netPosition: number;
  accounts: Array<{
    type: string;
    actual: number;
    virtual: number;
    variance: number;
  }>;
  activeLoan: {
    originalAmount: number;
    repaid: number;
    remaining: number;
    percentRepaid: string;
  } | null;
  highRiskCount: number;
  collectionsCount: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAccountIcon(type: string) {
  switch (type) {
    case "Operating": return <Wallet className="h-4 w-4" />;
    case "Taxes": return <Landmark className="h-4 w-4" />;
    case "Debt": return <CreditCard className="h-4 w-4" />;
    case "Marketing": return <Megaphone className="h-4 w-4" />;
    default: return <DollarSign className="h-4 w-4" />;
  }
}

export default function Financial() {
  const { toast } = useToast();
  const [allocateAmount, setAllocateAmount] = useState("");
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");

  const { data: summary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/financial/summary"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: overdueInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/overdue"],
  });

  const { data: activeLoan } = useQuery<InternalLoan | null>({
    queryKey: ["/api/internal-loans/active"],
  });

  const { data: payables = [] } = useQuery<VendorPayable[]>({
    queryKey: ["/api/vendor-payables/unpaid"],
  });

  const { data: leads = [] } = useLeads();

  const allocateMutation = useMutation({
    mutationFn: async (incomeAmount: number) => {
      return apiRequest("/api/accounts/allocate", "POST", { incomeAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      toast({ title: "Allocation complete", description: "Funds allocated to Profit First accounts" });
      setAllocateOpen(false);
      setAllocateAmount("");
    },
    onError: () => {
      toast({ title: "Allocation failed", variant: "destructive" });
    }
  });

  const applyInterestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/invoices/apply-interest", "POST", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      toast({ 
        title: "Interest applied", 
        description: `Updated ${data.updated?.length || 0} overdue invoices` 
      });
    },
    onError: () => {
      toast({ title: "Failed to apply interest", variant: "destructive" });
    }
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/invoices/send-reminders", "POST", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/overdue"] });
      toast({ 
        title: "Reminders sent", 
        description: `Sent ${data.remindersSent || 0} payment reminder emails` 
      });
    },
    onError: () => {
      toast({ title: "Failed to send reminders", variant: "destructive" });
    }
  });

  const repayLoanMutation = useMutation({
    mutationFn: async ({ loanId, amount }: { loanId: number; amount: number }) => {
      return apiRequest(`/api/internal-loans/${loanId}/repay`, "POST", { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-loans/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      toast({ title: "Repayment recorded" });
      setRepayAmount("");
    },
    onError: () => {
      toast({ title: "Repayment failed", variant: "destructive" });
    }
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, actualBalance }: { id: number; actualBalance: number }) => {
      return apiRequest(`/api/accounts/${id}`, "PATCH", { actualBalance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      toast({ title: "Balance updated" });
    },
    onError: () => {
      toast({ title: "Failed to update balance", variant: "destructive" });
    }
  });

  if (summaryLoading) {
    return <div className="p-6">Loading financial data...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Financial Command Center</h1>
                  <p className="text-sm text-muted-foreground">Profit First Cash Management & Collections</p>
                </div>
              </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-allocate-income">
                  <Calculator className="h-4 w-4 mr-2" />
                  Allocate Income
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Profit First Allocation</DialogTitle>
                  <DialogDescription>
                    Enter income amount to calculate Profit First allocations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Income Amount</label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={allocateAmount}
                      onChange={(e) => setAllocateAmount(e.target.value)}
                      data-testid="input-allocate-amount"
                    />
                  </div>
                  {allocateAmount && Number(allocateAmount) > 0 && (
                    <div className="space-y-2 p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">Allocation Preview:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Operating (76%):</span>
                        <span className="font-medium">{formatCurrency(Number(allocateAmount) * 0.76)}</span>
                        <span>Taxes (10%):</span>
                        <span className="font-medium">{formatCurrency(Number(allocateAmount) * 0.10)}</span>
                        <span>Marketing (10%):</span>
                        <span className="font-medium">{formatCurrency(Number(allocateAmount) * 0.10)}</span>
                        <span>Debt (4%):</span>
                        <span className="font-medium">{formatCurrency(Number(allocateAmount) * 0.04)}</span>
                      </div>
                    </div>
                  )}
                  <Button 
                    className="w-full" 
                    onClick={() => allocateMutation.mutate(Number(allocateAmount))}
                    disabled={!allocateAmount || Number(allocateAmount) <= 0 || allocateMutation.isPending}
                    data-testid="button-confirm-allocate"
                  >
                    {allocateMutation.isPending ? "Allocating..." : "Apply Allocation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              onClick={() => applyInterestMutation.mutate()}
              disabled={applyInterestMutation.isPending}
              data-testid="button-apply-interest"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${applyInterestMutation.isPending ? 'animate-spin' : ''}`} />
              Apply Interest
            </Button>
            <Button 
              variant="outline" 
              onClick={() => sendRemindersMutation.mutate()}
              disabled={sendRemindersMutation.isPending}
              data-testid="button-send-reminders"
            >
              <Clock className={`h-4 w-4 mr-2 ${sendRemindersMutation.isPending ? 'animate-spin' : ''}`} />
              Send Reminders
            </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="financial-health-bar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Cash</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500" data-testid="text-current-cash">
                {formatCurrency(summary?.currentCash || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Operating account balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AR</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-ar">
                {formatCurrency(summary?.totalAR || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary?.totalOverdue || 0)} overdue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AP</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500" data-testid="text-total-ap">
                {formatCurrency(summary?.totalAP || 0)}
              </div>
              <p className="text-xs text-muted-foreground">{payables.length} unpaid bills</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
              {(summary?.netPosition || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary?.netPosition || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-net-position">
                {formatCurrency(summary?.netPosition || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Cash + AR - AP</p>
            </CardContent>
          </Card>
        </div>

        {(summary?.highRiskCount || 0) > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {summary?.highRiskCount} High-Risk Invoice{(summary?.highRiskCount || 0) > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Invoices over $50k or 60+ days overdue require immediate attention
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <WeightedRevenueForecast leads={leads} />

        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts" data-testid="tab-accounts">Profit First</TabsTrigger>
            <TabsTrigger value="collections" data-testid="tab-collections">Collections</TabsTrigger>
            <TabsTrigger value="loans" data-testid="tab-loans">Loans</TabsTrigger>
            <TabsTrigger value="payables" data-testid="tab-payables">Payables</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account) => {
                const variance = Number(account.virtualBalance) - Number(account.actualBalance);
                return (
                  <Card key={account.id} data-testid={`card-account-${account.accountType.toLowerCase()}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        {getAccountIcon(account.accountType)}
                        <CardTitle className="text-base">{account.accountType}</CardTitle>
                      </div>
                      <Badge variant="outline">{account.allocationPercent}%</Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Actual Balance</p>
                          <p className="text-lg font-semibold">{formatCurrency(Number(account.actualBalance))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Should Be</p>
                          <p className="text-lg font-semibold">{formatCurrency(Number(account.virtualBalance))}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Variance:</span>
                          <span className={`text-sm font-medium ${variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                          </span>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">Update</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update {account.accountType} Balance</DialogTitle>
                              <DialogDescription>Enter the current actual balance in this account</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <Input
                                type="number"
                                placeholder="Enter actual balance"
                                defaultValue={Number(account.actualBalance)}
                                onChange={(e) => {
                                  const btn = e.target.nextElementSibling as HTMLButtonElement;
                                  if (btn) btn.dataset.value = e.target.value;
                                }}
                              />
                              <Button 
                                className="w-full"
                                onClick={(e) => {
                                  const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                                  updateAccountMutation.mutate({ 
                                    id: account.id, 
                                    actualBalance: Number(input.value) 
                                  });
                                }}
                              >
                                Update Balance
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="collections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Overdue Invoices ({overdueInvoices.length})
                </CardTitle>
                <CardDescription>
                  8% monthly interest applied to overdue balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overdueInvoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No overdue invoices</p>
                ) : (
                  <div className="space-y-3">
                    {overdueInvoices.map((invoice) => {
                      const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
                      return (
                        <div 
                          key={invoice.id} 
                          className={`p-4 rounded-md border ${invoice.isHighRisk ? 'border-destructive bg-destructive/5' : ''}`}
                          data-testid={`invoice-overdue-${invoice.id}`}
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{invoice.clientName}</span>
                                {invoice.isHighRisk && (
                                  <Badge variant="destructive">High Risk</Badge>
                                )}
                                <Badge variant="outline">{invoice.invoiceNumber}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {invoice.daysOverdue} days overdue
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="font-semibold text-destructive">
                                {formatCurrency(outstanding)}
                              </p>
                              {Number(invoice.interestAccrued) > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  +{formatCurrency(Number(invoice.interestAccrued))} interest
                                </p>
                              )}
                            </div>
                          </div>
                          {invoice.status === "Collections" && (
                            <div className="mt-2 pt-2 border-t">
                              <Badge variant="destructive" className="gap-1">
                                <FileText className="h-3 w-3" />
                                Demand Letter / Small Claims
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans" className="space-y-4">
            {activeLoan ? (
              <Card data-testid="card-internal-loan">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PiggyBank className="h-5 w-5" />
                    Internal Loan: {activeLoan.fromAccountType} to {activeLoan.toAccountType}
                  </CardTitle>
                  <CardDescription>
                    {activeLoan.reason || "Inter-account borrowing"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Original</p>
                      <p className="text-xl font-semibold">{formatCurrency(Number(activeLoan.originalAmount))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Repaid</p>
                      <p className="text-xl font-semibold text-green-500">{formatCurrency(Number(activeLoan.amountRepaid))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="text-xl font-semibold text-amber-500">{formatCurrency(Number(activeLoan.remainingBalance))}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Repayment Progress</span>
                      <span>{((Number(activeLoan.amountRepaid) / Number(activeLoan.originalAmount)) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={(Number(activeLoan.amountRepaid) / Number(activeLoan.originalAmount)) * 100} 
                      className="h-3"
                      data-testid="progress-loan-repayment"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Input
                      type="number"
                      placeholder="Repayment amount"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      data-testid="input-repay-amount"
                    />
                    <Button 
                      onClick={() => repayLoanMutation.mutate({ loanId: activeLoan.id, amount: Number(repayAmount) })}
                      disabled={!repayAmount || Number(repayAmount) <= 0 || repayLoanMutation.isPending}
                      data-testid="button-repay-loan"
                    >
                      Repay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No active internal loans</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Vendor Priority List ({payables.length})
                </CardTitle>
                <CardDescription>
                  Recurring overhead and vendor payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payables.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No unpaid payables</p>
                ) : (
                  <div className="space-y-3">
                    {payables.sort((a, b) => (b.priority || 0) - (a.priority || 0)).map((payable) => (
                      <div key={payable.id} className="flex items-center justify-between p-3 rounded-md border" data-testid={`payable-${payable.id}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            payable.priority === 5 ? 'bg-red-500' : 
                            payable.priority === 4 ? 'bg-amber-500' : 'bg-muted-foreground'
                          }`} />
                          <div>
                            <p className="font-medium">{payable.vendorName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {payable.description && <span>{payable.description}</span>}
                              {payable.isRecurring && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {payable.recurringFrequency}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(Number(payable.amount))}</p>
                          {payable.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(payable.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <CompensationSettings />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
    </div>
  );
}

// Compensation Splits Settings Component
function CompensationSettings() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", role: "", type: "commission", defaultRate: "5" });
  const [overheadRate, setOverheadRate] = useState("15");
  const [targetMargin, setTargetMargin] = useState("20");

  const { data: splits = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/compensation-splits"],
  });

  const { data: settings } = useQuery<{ overheadRate: number; targetNetMargin: number }>({
    queryKey: ["/api/settings/financial"],
  });

  // Update state when settings load
  useEffect(() => {
    if (settings) {
      setOverheadRate(settings.overheadRate?.toString() || "15");
      setTargetMargin(settings.targetNetMargin?.toString() || "20");
    }
  }, [settings]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/compensation-splits", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compensation-splits"] });
      setIsAddOpen(false);
      setFormData({ name: "", role: "", type: "commission", defaultRate: "5" });
      toast({ title: "Stakeholder added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/compensation-splits/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compensation-splits"] });
      setEditingSplit(null);
      toast({ title: "Updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/compensation-splits/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compensation-splits"] });
      toast({ title: "Deleted" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/settings/financial", "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/financial"] });
      toast({ title: "Settings updated" });
    },
  });

  const totalPercentage = splits.reduce((sum, s) => sum + parseFloat(s.defaultRate || 0), 0);
  const typeLabels: Record<string, string> = {
    commission: "Sales Commission",
    referral: "Referral Fee",
    partner: "Partner Share",
    bonus: "Performance Bonus",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Compensation Stakeholders
            </CardTitle>
            <CardDescription>
              People who receive a percentage of project revenue
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-stakeholder">
                <Plus className="h-4 w-4 mr-2" /> Add Stakeholder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Compensation Stakeholder</DialogTitle>
                <DialogDescription>Add a person who receives a percentage of project revenue</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Smith"
                    data-testid="input-stakeholder-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Sales Rep, Referral Partner, etc."
                    data-testid="input-stakeholder-role"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    data-testid="select-stakeholder-type"
                  >
                    <option value="commission">Sales Commission</option>
                    <option value="referral">Referral Fee</option>
                    <option value="partner">Partner Share</option>
                    <option value="bonus">Performance Bonus</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Rate (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.defaultRate}
                    onChange={(e) => setFormData({ ...formData, defaultRate: e.target.value })}
                    data-testid="input-stakeholder-rate"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending || !formData.name}
                  data-testid="button-save-stakeholder"
                >
                  {createMutation.isPending ? "Saving..." : "Add Stakeholder"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : splits.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No stakeholders configured yet</p>
          ) : (
            <div className="space-y-3">
              {splits.map((split) => (
                <div
                  key={split.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                  data-testid={`stakeholder-${split.id}`}
                >
                  {editingSplit?.id === split.id ? (
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <Input
                        value={editingSplit.name}
                        onChange={(e) => setEditingSplit({ ...editingSplit, name: e.target.value })}
                        className="w-32"
                        data-testid="input-edit-name"
                      />
                      <Input
                        value={editingSplit.role || ""}
                        onChange={(e) => setEditingSplit({ ...editingSplit, role: e.target.value })}
                        className="w-32"
                        placeholder="Role"
                        data-testid="input-edit-role"
                      />
                      <Input
                        type="number"
                        value={editingSplit.defaultRate}
                        onChange={(e) => setEditingSplit({ ...editingSplit, defaultRate: e.target.value })}
                        className="w-20"
                        data-testid="input-edit-rate"
                      />
                      <span>%</span>
                      <Button size="sm" onClick={() => updateMutation.mutate(editingSplit)} data-testid="button-save-edit">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSplit(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{split.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {split.role && <span>{split.role}</span>}
                            <Badge variant="secondary" className="text-xs">
                              {typeLabels[split.type] || split.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">{parseFloat(split.defaultRate).toFixed(1)}%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSplit({ ...split })}
                          data-testid={`button-edit-${split.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(split.id)}
                          className="text-destructive"
                          data-testid={`button-delete-${split.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {totalPercentage > 0 && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="font-medium">Total Compensation</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${totalPercentage > 50 ? 'text-amber-500' : ''}`}>
                      {totalPercentage.toFixed(1)}%
                    </span>
                    {totalPercentage > 50 && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        High
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Business Settings
          </CardTitle>
          <CardDescription>Configure overhead rate and target margins</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Overhead Rate (%)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={overheadRate}
                  onChange={(e) => setOverheadRate(e.target.value)}
                  data-testid="input-overhead-rate"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Allocated to ops, rent, software</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Net Margin (%)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                  data-testid="input-target-margin"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Goal for true net profit</p>
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={() => updateSettingsMutation.mutate({ overheadRate, targetNetMargin: targetMargin })}
            disabled={updateSettingsMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface Lead {
  id: number;
  value?: string | null;
  probability?: number | null;
  dealStage: string;
  lastContactDate?: Date | string | null;
}

const MONTHLY_OPEX = 35000; // Monthly break-even point (operating expenses)

function WeightedRevenueForecast({ leads }: { leads: Lead[] }) {
  const stageProbabilityDefaults: Record<string, number> = {
    'New': 10, 'Contacted': 25, 'Proposal': 50, 'Negotiation': 75, 'Closed Won': 100, 'Closed Lost': 0,
  };

  const now = new Date();
  const months = [0, 1, 2].map(i => {
    const monthDate = addMonths(startOfMonth(now), i);
    return {
      key: format(monthDate, 'yyyy-MM'),
      label: format(monthDate, 'MMM yyyy'),
      projected: 0,
    };
  });

  const openLeads = leads.filter(l => 
    !['Closed Won', 'Closed Lost'].includes(l.dealStage)
  );

  openLeads.forEach(lead => {
    const value = Number(lead.value) || 0;
    const probability = lead.probability ?? stageProbabilityDefaults[lead.dealStage] ?? 25;
    const weighted = (value * probability) / 100;
    
    const monthIndex = Math.min(
      lead.dealStage === 'Negotiation' ? 0 : 
      lead.dealStage === 'Proposal' ? 1 : 2,
      months.length - 1
    );
    months[monthIndex].projected += weighted;
  });

  const maxValue = Math.max(...months.map(m => m.projected), MONTHLY_OPEX * 1.2);

  return (
    <Card data-testid="card-revenue-forecast">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weighted Revenue Forecast
          </CardTitle>
          <CardDescription>Projected revenue vs break-even ($35k/mo OpEx)</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Next 3 months total</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(months.reduce((sum, m) => sum + m.projected, 0))}
          </p>
        </div>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              domain={[0, maxValue]}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Projected']}
            />
            <ReferenceLine 
              y={MONTHLY_OPEX} 
              stroke="#ef4444" 
              strokeDasharray="5 5" 
              label={{ value: 'Break-Even', position: 'right', fill: '#ef4444', fontSize: 11 }}
            />
            <Bar 
              dataKey="projected" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]} 
              name="Projected Revenue"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
