"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, X, Check, Wrench, Plus, Trash2, Search, Loader2 } from "lucide-react";
import {
  Camera,
  Settings,
  User,
  Home,
  Mail,
  Phone,
  Wifi,
  Tv,
  Car,
  Coffee,
  Bath,
  Bed,
  Hotel,
  Key,
  Computer,
  Sun,
  Music,
  Briefcase,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  ImageIcon,
  Lock,
  Map,
  MessageSquare,
  Package,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "react-toastify";

type Service = {
  icon: string;
  title: string;
  description: string;
};

type OurServicesProps = {
  clientId: string;
  subTitle: string;
  services: Service[];
  loading?: boolean;
  onSave: (data: {
    clientId: string;
    subTitle: string;
    services: Service[];
  }) => void;
};

const iconComponents = {
  Camera,
  Settings,
  User,
  Home,
  Mail,
  Phone,
  Wifi,
  Tv,
  Car,
  Coffee,
  Bath,
  Bed,
  Hotel,
  Key,
  Computer,
  Sun,
  Music,
  X,
  Wrench,
  Briefcase,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  ImageIcon,
  Lock,
  Map,
  MessageSquare,
  Package,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Zap,
};

export const DisplayIcon = ({
  iconName,
  size = 32,
  color = "currentColor",
}: {
  iconName: string;
  size?: number;
  color?: string;
  loading?: boolean
}) => {
  const IconComponent = iconComponents[iconName as keyof typeof iconComponents];
  return IconComponent ? <IconComponent size={size} color={color} /> : <X size={size} />;
};

export function OurServicesCard({ clientId, subTitle = "", services = [], onSave, loading }: OurServicesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempSubTitle, setTempSubTitle] = useState(subTitle);
  const [tempServices, setTempServices] = useState<Service[]>(services);
  const hasData = subTitle || services.length > 0;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedIcon, setTempSelectedIcon] = useState<string | null>(null);
  const [tempServiceTitle, setTempServiceTitle] = useState("");
  const [tempServiceDescription, setTempServiceDescription] = useState("");
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);

  const availableIcons = Object.keys(iconComponents);

  const filteredIcons = searchQuery.trim()
    ? availableIcons.filter((iconName) => iconName.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableIcons;

  const handleEdit = () => {
    setTempSubTitle(subTitle);
    setTempServices([...services]);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave({
      clientId,
      subTitle: tempSubTitle,
      services: tempServices,
    });
    setIsEditing(false);
    toast.success("Services saved successfully");
  };

  const handleCancel = () => {
    setTempSubTitle(subTitle);
    setTempServices([...services]);
    setIsEditing(false);
  };

  const handleIconClick = (iconName: string) => {
    console.log("Selected icon:", iconName);
    setTempSelectedIcon(iconName);
  };

  const handleAddService = () => {
    if (!tempSelectedIcon || !tempServiceTitle.trim()) {
      toast.error("Please select an icon and enter a title");
      return;
    }

    const newService = {
      icon: tempSelectedIcon,
      title: tempServiceTitle.trim(),
      description: tempServiceDescription.trim(),
    };

    if (editingServiceIndex !== null) {
      const updatedServices = [...tempServices];
      updatedServices[editingServiceIndex] = newService;
      setTempServices(updatedServices);
      toast.success("Service updated successfully");
    } else {
      setTempServices([...tempServices, newService]);
      toast.success("Service added successfully");
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTempSelectedIcon(null);
    setTempServiceTitle("");
    setTempServiceDescription("");
    setSearchQuery("");
    setEditingServiceIndex(null);
  };

  const handleRemoveService = (index: number) => {
    setTempServices(tempServices.filter((_, i) => i !== index));
    toast.success("Service removed successfully");
  };

  const handleEditService = (index: number) => {
    const service = tempServices[index];
    setTempSelectedIcon(service.icon);
    setTempServiceTitle(service.title);
    setTempServiceDescription(service.description);
    setEditingServiceIndex(index);
    setIsModalOpen(true);
  };

  const openAddServiceModal = () => {
    setTempSelectedIcon(null);
    setTempServiceTitle("");
    setTempServiceDescription("");
    setEditingServiceIndex(null);
    setIsModalOpen(true);
  };

  const renderIconGrid = () => {
    if (filteredIcons.length === 0) {
      return <div className="py-4 text-center text-muted-foreground">No icons found matching your search</div>;
    }

    return (
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-7 md:grid-cols-9">
        {filteredIcons.map((iconName) => (
          <div
            key={iconName}
            className={`cursor-pointer rounded-lg border p-2 transition-all ${tempSelectedIcon === iconName
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-primary/10"
              }`}
            onClick={() => handleIconClick(iconName)}
          >
            <DisplayIcon iconName={iconName} size={24} />
          </div>
        ))}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <Card className="w-full overflow-hidden bg-card shadow-xl">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <div className="rounded-full border border-border bg-primary/10 p-2">
                <Wrench className="h-5 w-5" />
              </div>
              Our Team
            </h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading services data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full overflow-hidden bg-card shadow-xl">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <div className="rounded-full border border-border bg-primary/10 p-2">
              <Wrench className="h-5 w-5" />
            </div>
            Our Services
          </h2>
          {hasData && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              className="h-8 w-8 rounded-full transition-colors hover:bg-muted/50"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {!hasData && !isEditing ? (
          <Button variant="ghost" className="hover:bg-muted/30" onClick={handleEdit}>
            <span className="mr-2 text-lg">+</span> Add Services
          </Button>
        ) : (
          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subtitle</label>
                  <Input
                    value={tempSubTitle}
                    onChange={(e) => setTempSubTitle(e.target.value)}
                    placeholder="Services section subtitle"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Services</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openAddServiceModal}
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="h-3 w-3" /> Add Service
                    </Button>
                  </div>

                  {tempServices.length === 0 ? (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No services added yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {tempServices.map((service, index) => (
                        <div key={index} className="relative rounded-lg border border-border p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <DisplayIcon iconName={service.icon} size={20} />
                              </div>
                              <h3 className="font-medium">{service.title}</h3>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditService(index)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveService(index)}
                                className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="group rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subtitle</div>
                  <div className="mt-1 text-lg font-medium">{subTitle || "-"}</div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Services</div>
                  {services.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {services.map((service, index) => (
                        <div key={index} className="flex flex-col rounded-lg border border-border p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <DisplayIcon iconName={service.icon} size={20} />
                            </div>
                            <h3 className="font-medium">{service.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No services added yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {isEditing && (
        <CardFooter className="justify-end gap-4 border-t border-border bg-muted/30 pt-3">
          <Button type="button" onClick={handleCancel} variant="outline">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            <Check className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </CardFooter>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{editingServiceIndex !== null ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Select Icon</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search icons..."
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto p-1">{renderIconGrid()}</div>

              <div>
                <label className="mb-2 block text-sm font-medium">Service Title</label>
                <Input
                  type="text"
                  value={tempServiceTitle}
                  onChange={(e) => setTempServiceTitle(e.target.value)}
                  placeholder="Enter service title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Service Description</label>
                <Textarea
                  value={tempServiceDescription}
                  onChange={(e) => setTempServiceDescription(e.target.value)}
                  placeholder="Enter service description"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleAddService}
              disabled={!tempSelectedIcon || !tempServiceTitle.trim()}
              variant="default"
            >
              {editingServiceIndex !== null ? "Update Service" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}