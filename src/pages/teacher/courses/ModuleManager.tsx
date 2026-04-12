// Task 66.5: Course Module Manager — Create/edit modules with materials
// Requirements: 76.1, 76.2, 76.3, 76.4
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import {
  useCourseModules,
  useCourseMaterials,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  uploadMaterialFile,
  type CourseModule,
  type CourseMaterial,
  type MaterialType,
} from '@/hooks/useCourseModules';
import { useCLOs } from '@/hooks/useCLOs';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  FolderOpen,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  Link as LinkIcon,
  Video,
  File,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import Shimmer from '@/components/shared/Shimmer';

// ─── Schemas ────────────────────────────────────────────────────────────────

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  sort_order: z.number().int().min(0),
  is_published: z.boolean(),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

const materialSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  type: z.enum(['file', 'link', 'video', 'text']),
  content_url: z.string().optional(),
  description: z.string().optional(),
  sort_order: z.number().int().min(0),
  is_published: z.boolean(),
  clo_ids: z.array(z.string()).optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

// ─── Teacher courses hook ───────────────────────────────────────────────────

interface TeacherCourse {
  id: string;
  name: string;
  code: string;
}

const useTeacherCourses = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courses.list({ teacherId, role: 'module-manager' }),
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as TeacherCourse[];
    },
    enabled: !!teacherId,
  });
};

// ─── Material Type Icons ────────────────────────────────────────────────────

const TYPE_ICONS: Record<MaterialType, typeof FileText> = {
  file: FileText,
  link: LinkIcon,
  video: Video,
  text: File,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  file: 'bg-blue-50 text-blue-600',
  link: 'bg-green-50 text-green-600',
  video: 'bg-purple-50 text-purple-600',
  text: 'bg-gray-50 text-gray-600',
};

// ─── Module Materials Sub-component ─────────────────────────────────────────

interface ModuleMaterialsProps {
  module: CourseModule;
  teacherId: string;
  courseId: string;
}

const ModuleMaterials = ({ module: mod, teacherId, courseId }: ModuleMaterialsProps) => {
  const { data: materials, isLoading } = useCourseMaterials(mod.id);
  const { data: closData } = useCLOs(courseId);
  const clos = closData?.data;
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseMaterial | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      title: '',
      type: 'link',
      content_url: '',
      description: '',
      sort_order: (materials?.length ?? 0),
      is_published: false,
      clo_ids: [],
    },
  });

  const watchType = form.watch('type');

  const openCreate = () => {
    setEditingMaterial(null);
    form.reset({
      title: '',
      type: 'link',
      content_url: '',
      description: '',
      sort_order: (materials?.length ?? 0),
      is_published: false,
      clo_ids: [],
    });
    setShowMaterialForm(true);
  };

  const openEdit = (m: CourseMaterial) => {
    setEditingMaterial(m);
    form.reset({
      title: m.title,
      type: m.type,
      content_url: m.content_url ?? '',
      description: m.description ?? '',
      sort_order: m.sort_order,
      is_published: m.is_published,
      clo_ids: m.clo_ids,
    });
    setShowMaterialForm(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMaterialFile(file, courseId);
      form.setValue('content_url', url);
      form.setValue('title', form.getValues('title') || file.name.replace(/\.[^.]+$/, ''));
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (data: MaterialFormData) => {
    if (editingMaterial) {
      updateMaterial.mutate(
        {
          id: editingMaterial.id,
          title: data.title,
          type: data.type as MaterialType,
          content_url: data.content_url || null,
          description: data.description || null,
          sort_order: data.sort_order,
          is_published: data.is_published,
          clo_ids: data.clo_ids,
          performedBy: teacherId,
        },
        {
          onSuccess: () => {
            toast.success('Material updated');
            setShowMaterialForm(false);
            setEditingMaterial(null);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createMaterial.mutate(
        {
          module_id: mod.id,
          title: data.title,
          type: data.type as MaterialType,
          content_url: data.content_url || undefined,
          file_path: data.type === 'file' ? data.content_url || undefined : undefined,
          description: data.description || undefined,
          sort_order: data.sort_order,
          is_published: data.is_published,
          clo_ids: data.clo_ids,
          performedBy: teacherId,
        },
        {
          onSuccess: () => {
            toast.success('Material added');
            setShowMaterialForm(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const handleDeleteMaterial = () => {
    if (!deleteTarget) return;
    deleteMaterial.mutate(
      { id: deleteTarget.id, performedBy: teacherId },
      {
        onSuccess: () => {
          toast.success('Material deleted');
          setDeleteTarget(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const isPending = createMaterial.isPending || updateMaterial.isPending;

  return (
    <div className="ps-6 space-y-2">
      {isLoading ? (
        <Shimmer className="h-10 rounded-lg" />
      ) : (
        <>
          {(materials ?? []).map((m) => {
            const Icon = TYPE_ICONS[m.type];
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <div className={`p-1.5 rounded-lg ${TYPE_COLORS[m.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium flex-1 truncate">{m.title}</span>
                {!m.is_published && (
                  <Badge variant="outline" className="text-xs text-gray-400">Draft</Badge>
                )}
                {m.clo_ids.length > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    {m.clo_ids.length} CLO{m.clo_ids.length > 1 ? 's' : ''}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(m)}>
                  <Pencil className="h-3.5 w-3.5 text-gray-400" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(m)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            );
          })}
          <Button variant="ghost" size="sm" onClick={openCreate} className="text-xs text-blue-600">
            <Plus className="h-3.5 w-3.5 me-1" /> Add Material
          </Button>
        </>
      )}

      {/* Material Form */}
      {showMaterialForm && (
        <Card className="bg-slate-50 border shadow-sm rounded-lg p-4 mt-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Title</FormLabel>
                      <FormControl><Input placeholder="Material title" {...field} className="h-8 text-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="file">File</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchType === 'file' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.pptx,.png,.jpg,.jpeg,.gif,.mp4,.zip"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : <Upload className="h-3.5 w-3.5 me-1" />}
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </Button>
                  {form.getValues('content_url') && (
                    <p className="text-xs text-green-600 mt-1">File uploaded ✓</p>
                  )}
                </div>
              )}

              {(watchType === 'link' || watchType === 'video') && (
                <FormField
                  control={form.control}
                  name="content_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {watchType === 'video' ? 'Video URL (YouTube/Vimeo)' : 'URL'}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchType === 'text' && (
                <FormField
                  control={form.control}
                  name="content_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Text Content</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter text content..." rows={3} {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description" {...field} className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CLO Linking */}
              {clos && (clos as Array<{ id: string; title: string }>).length > 0 && (
                <FormField
                  control={form.control}
                  name="clo_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Link to CLOs</FormLabel>
                      <div className="space-y-1">
                        {(clos as Array<{ id: string; title: string }>).map((clo) => (
                          <label key={clo.id} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={(field.value ?? []).includes(clo.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];
                                field.onChange(
                                  checked
                                    ? [...current, clo.id]
                                    : current.filter((id) => id !== clo.id),
                                );
                              }}
                            />
                            {clo.title}
                          </label>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_published"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 pt-5">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0 text-xs">Published</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending} className="text-xs bg-gradient-to-r from-teal-500 to-blue-600">
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingMaterial ? 'Update' : 'Add'}
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => { setShowMaterialForm(false); setEditingMaterial(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        title="Delete Material"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDeleteMaterial}
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMaterial.isPending}
      />
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const ModuleManager = () => {
  const { user } = useAuth();
  const teacherId = user?.id;

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseModule | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const { data: courses, isLoading: coursesLoading } = useTeacherCourses(teacherId);

  // Derive effective course — default to first course if none selected
  const effectiveCourseId = selectedCourseId || (courses && courses.length > 0 ? courses[0]?.id ?? '' : '');

  const { data: modules, isLoading: modulesLoading } = useCourseModules(effectiveCourseId || undefined);

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();

  const moduleForm = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: '', description: '', sort_order: 0, is_published: false },
  });

  const toggleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const openCreateModule = () => {
    setEditingModule(null);
    moduleForm.reset({
      title: '',
      description: '',
      sort_order: (modules?.length ?? 0),
      is_published: false,
    });
    setShowModuleForm(true);
  };

  const openEditModule = (m: CourseModule) => {
    setEditingModule(m);
    moduleForm.reset({
      title: m.title,
      description: m.description ?? '',
      sort_order: m.sort_order,
      is_published: m.is_published,
    });
    setShowModuleForm(true);
  };

  const onModuleSubmit = (data: ModuleFormData) => {
    if (!teacherId) return;

    if (editingModule) {
      updateModule.mutate(
        {
          id: editingModule.id,
          title: data.title,
          description: data.description || null,
          sort_order: data.sort_order,
          is_published: data.is_published,
          performedBy: teacherId,
        },
        {
          onSuccess: () => {
            toast.success('Module updated');
            setShowModuleForm(false);
            setEditingModule(null);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createModule.mutate(
        {
          course_id: effectiveCourseId,
          title: data.title,
          description: data.description,
          sort_order: data.sort_order,
          is_published: data.is_published,
          performedBy: teacherId,
        },
        {
          onSuccess: () => {
            toast.success('Module created');
            setShowModuleForm(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const handleDeleteModule = () => {
    if (!deleteTarget || !teacherId) return;
    deleteModule.mutate(
      { id: deleteTarget.id, performedBy: teacherId },
      {
        onSuccess: () => {
          toast.success('Module deleted');
          setDeleteTarget(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const isModulePending = createModule.isPending || updateModule.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Course Modules</h1>
        <Button
          onClick={openCreateModule}
          disabled={!effectiveCourseId}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform duration-100"
        >
          <Plus className="h-4 w-4" /> New Module
        </Button>
      </div>

      {/* Course Selector */}
      <div className="max-w-xs">
        {coursesLoading ? (
          <Shimmer className="h-10 rounded-lg" />
        ) : (
          <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {(courses ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Module Form */}
      {showModuleForm && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            {editingModule ? 'Edit Module' : 'New Module'}
          </h2>
          <Form {...moduleForm}>
            <form onSubmit={moduleForm.handleSubmit(onModuleSubmit)} className="space-y-4">
              <FormField
                control={moduleForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Week 1: Introduction" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={moduleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl><Textarea placeholder="Module description" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={moduleForm.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={moduleForm.control}
                  name="is_published"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 pt-6">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Published</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isModulePending} className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform duration-100">
                  {isModulePending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingModule ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowModuleForm(false); setEditingModule(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {/* Modules List */}
      {modulesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (modules ?? []).length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No modules yet. Create one to organize your course materials.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(modules ?? []).map((m) => {
            const isExpanded = expandedModules.has(m.id);
            return (
              <Card key={m.id} className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(m.id); } }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                  <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-bold flex-1 truncate">{m.title}</span>
                  {!m.is_published && (
                    <Badge variant="outline" className="text-xs text-gray-400">Draft</Badge>
                  )}
                  <span className="text-xs text-gray-400">#{m.sort_order}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => { e.stopPropagation(); openEditModule(m); }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
                {isExpanded && teacherId && (
                  <div className="border-t border-slate-100 py-3 px-2">
                    <ModuleMaterials module={m} teacherId={teacherId} courseId={effectiveCourseId} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        title="Delete Module"
        description={`Delete "${deleteTarget?.title}" and all its materials? This cannot be undone.`}
        onConfirm={handleDeleteModule}
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteModule.isPending}
      />
    </div>
  );
};

export default ModuleManager;
