/**
 * HelpArticleEditor - WYSIWYG-style editor for help articles
 * 
 * CEO-only component for creating and editing help articles
 */

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface HelpArticle {
    id?: number;
    title: string;
    slug: string;
    category: string;
    content: string;
    sortOrder: number;
    isPublished: boolean;
}

const CATEGORIES = [
    { value: "getting-started", label: "Getting Started" },
    { value: "sales", label: "Sales & Pipeline" },
    { value: "cpq", label: "CPQ Quote Builder" },
    { value: "production", label: "Production" },
    { value: "fieldhub", label: "FieldHub Mobile" },
    { value: "ai-tools", label: "AI & Tools" },
    { value: "settings", label: "Settings" },
    { value: "faq", label: "FAQ" },
];

interface HelpArticleEditorProps {
    article?: HelpArticle | null;
    open: boolean;
    onClose: () => void;
}

export function HelpArticleEditor({ article, open, onClose }: HelpArticleEditorProps) {
    const { toast } = useToast();
    const isEdit = !!article?.id;

    const [formData, setFormData] = useState<HelpArticle>({
        title: "",
        slug: "",
        category: "getting-started",
        content: "# Article Title\n\nStart writing your article here...",
        sortOrder: 0,
        isPublished: true,
    });

    // Update form when article prop changes
    useEffect(() => {
        if (article) {
            setFormData({
                title: article.title || "",
                slug: article.slug || "",
                category: article.category || "getting-started",
                content: article.content || "",
                sortOrder: article.sortOrder || 0,
                isPublished: article.isPublished ?? true,
            });
        } else {
            setFormData({
                title: "",
                slug: "",
                category: "getting-started",
                content: "# Article Title\n\nStart writing your article here...",
                sortOrder: 0,
                isPublished: true,
            });
        }
    }, [article, open]);

    const saveMutation = useMutation({
        mutationFn: async (data: HelpArticle) => {
            if (isEdit && article?.id) {
                const res = await apiRequest("PUT", `/api/help/articles/${article.id}`, data);
                return res.json();
            }
            const res = await apiRequest("POST", "/api/help/articles", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/help/articles"] });
            toast({ title: "Success", description: `Article ${isEdit ? "updated" : "created"} successfully` });
            onClose();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
    };

    const handleTitleChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            title: value,
            slug: prev.slug || generateSlug(value),
        }));
    };

    const handleSubmit = () => {
        if (!formData.title || !formData.slug || !formData.content) {
            toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }
        saveMutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Article" : "Create New Article"}</DialogTitle>
                    <DialogDescription>
                        Write help content in Markdown format. Use Preview to see how it will look.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder="Article title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug *</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                placeholder="article-slug"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sortOrder">Sort Order</Label>
                                <Input
                                    id="sortOrder"
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                                    className="w-24"
                                />
                            </div>
                            <div className="flex items-center gap-2 pb-2">
                                <Switch
                                    checked={formData.isPublished}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
                                />
                                <Label>Published</Label>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="edit" className="w-full">
                        <TabsList>
                            <TabsTrigger value="edit" className="gap-1">
                                Edit
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="gap-1">
                                <Eye className="h-4 w-4" />
                                Preview
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="edit">
                            <Textarea
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Write your article in Markdown..."
                                className="min-h-[400px] font-mono text-sm"
                            />
                        </TabsContent>
                        <TabsContent value="preview">
                            <div className="prose dark:prose-invert max-w-none min-h-[400px] p-4 border rounded-lg bg-card">
                                <ReactMarkdown>{formData.content}</ReactMarkdown>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {saveMutation.isPending ? "Saving..." : "Save Article"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default HelpArticleEditor;
