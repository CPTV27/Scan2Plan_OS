/**
 * DynamicHelpArticles - Article browser with search and admin controls
 * 
 * Fetches articles from API, displays by category, allows CEO editing
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Edit, Trash2, MoreVertical, RefreshCw, BookOpen, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { HelpArticleEditor } from "./HelpArticleEditor";

interface HelpArticle {
    id: number;
    title: string;
    slug: string;
    category: string;
    content: string;
    sortOrder: number;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    "getting-started": "Getting Started",
    "sales": "Sales & Pipeline",
    "cpq": "CPQ Quote Builder",
    "production": "Production",
    "fieldhub": "FieldHub Mobile",
    "ai-tools": "AI & Tools",
    "settings": "Settings",
    "faq": "FAQ",
};

export function DynamicHelpArticles() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isCEO = (user as any)?.claims?.role === "ceo";

    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);

    const { data: articles = [], isLoading } = useQuery<HelpArticle[]>({
        queryKey: ["/api/help/articles"],
        queryFn: getQueryFn<HelpArticle[]>({ on401: "throw" }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/help/articles/${id}`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/help/articles"] });
            toast({ title: "Deleted", description: "Article removed" });
        },
    });

    const seedMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/help/seed");
            return res.json();
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/help/articles"] });
            toast({ title: "Seeded", description: data.message });
        },
    });

    const importMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/help/import-tkb");
            return res.json();
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/help/articles"] });
            toast({ title: "Imported", description: data.message });
        },
        onError: (error: Error) => {
            toast({ title: "Import Failed", description: error.message, variant: "destructive" });
        },
    });

    // Filter articles
    const filteredArticles = (articles || []).filter((article: HelpArticle) => {
        const matchesSearch = search === "" ||
            article.title.toLowerCase().includes(search.toLowerCase()) ||
            article.content.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group by category
    const groupedArticles = filteredArticles.reduce((acc: Record<string, HelpArticle[]>, article: HelpArticle) => {
        const cat = article.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(article);
        return acc;
    }, {} as Record<string, HelpArticle[]>);

    const handleEdit = (article: HelpArticle) => {
        setEditingArticle(article);
        setEditorOpen(true);
    };

    const handleCreate = () => {
        setEditingArticle(null);
        setEditorOpen(true);
    };

    const handleCloseEditor = () => {
        setEditorOpen(false);
        setEditingArticle(null);
    };

    const categories = Object.keys(CATEGORY_LABELS);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with search and admin controls */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search articles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {isCEO && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                            <BookOpen className="h-4 w-4 mr-1" />
                            {importMutation.isPending ? "Importing..." : "Import TKB"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                            <Database className="h-4 w-4 mr-1" />
                            Seed
                        </Button>
                        <Button size="sm" onClick={handleCreate}>
                            <Plus className="h-4 w-4 mr-1" />
                            New Article
                        </Button>
                    </div>
                )}
            </div>

            {/* Category filter tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    {categories.map(cat => (
                        <TabsTrigger key={cat} value={cat} className="text-xs">
                            {CATEGORY_LABELS[cat]}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Articles display */}
            {filteredArticles.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No articles found</p>
                        {isCEO && (
                            <Button variant="outline" className="mt-4" onClick={handleCreate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create First Article
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedArticles).map(([category, categoryArticles]) => (
                        <Card key={category}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{CATEGORY_LABELS[category] || category}</CardTitle>
                                <CardDescription>{(categoryArticles as HelpArticle[]).length} article{(categoryArticles as HelpArticle[]).length !== 1 ? "s" : ""}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    {(categoryArticles as HelpArticle[]).map((article: HelpArticle) => (
                                        <AccordionItem key={article.id} value={`article-${article.id}`}>
                                            <AccordionTrigger className="text-left hover:no-underline">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span>{article.title}</span>
                                                    {!article.isPublished && (
                                                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                                                    )}
                                                </div>
                                                {isCEO && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(article)}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => deleteMutation.mutate(article.id)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="prose dark:prose-invert max-w-none text-sm">
                                                    <ReactMarkdown>{article.content}</ReactMarkdown>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Editor dialog */}
            <HelpArticleEditor
                article={editingArticle}
                open={editorOpen}
                onClose={handleCloseEditor}
            />
        </div>
    );
}

export default DynamicHelpArticles;
