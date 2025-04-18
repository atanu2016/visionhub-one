import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { useRecordings } from "@/hooks/useRecordings";
import { useCameras } from "@/hooks/useCameras";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, Filter, PlayCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, formatDistanceStrict, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecordingEvent } from "@/types";
import { cn } from "@/lib/utils";

const Recordings = () => {
  const { recordings, deleteRecording, exportRecording } = useRecordings();
  const { cameras } = useCameras();
  
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [cameraFilter, setCameraFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<string>("grid");
  
  const [selectedRecording, setSelectedRecording] = useState<RecordingEvent | null>(null);
  const [playbackDialogOpen, setPlaybackDialogOpen] = useState(false);
  
  const filteredRecordings = recordings.filter(recording => {
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(recording.startTime) >= dateFrom;
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      matchesDate = matchesDate && new Date(recording.startTime) <= endDate;
    }
    
    const matchesCamera = cameraFilter === "all" || recording.cameraId === cameraFilter;
    
    const matchesTrigger = triggerFilter === "all" || recording.triggerType === triggerFilter;
    
    return matchesDate && matchesCamera && matchesTrigger;
  });
  
  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setCameraFilter("all");
    setTriggerFilter("all");
  };
  
  const handlePlayback = (recording: RecordingEvent) => {
    setSelectedRecording(recording);
    setPlaybackDialogOpen(true);
  };
  
  const handleExport = async (recordingId: string) => {
    try {
      const result = await exportRecording(recordingId);
      console.log("Export successful:", result);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto bg-gradient-to-br from-background to-background/50">
      <PageHeader 
        title="Recordings" 
        description="View and manage camera recordings"
      />
      
      <div className="backdrop-blur-xl bg-card/50 border border-border/50 shadow-lg rounded-xl p-6">
        <div className="flex flex-wrap gap-4 items-start">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal bg-background/50 backdrop-blur-sm hover:bg-accent/10"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom && dateTo ? (
                  <>
                    {format(dateFrom, "MMM d, yyyy")} - {format(dateTo, "MMM d, yyyy")}
                  </>
                ) : (
                  <span>Pick date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex p-2 gap-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">From</p>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">To</p>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Select
            value={cameraFilter}
            onValueChange={setCameraFilter}
          >
            <SelectTrigger className="w-[200px] bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Filter by camera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cameras</SelectItem>
              {cameras.map(camera => (
                <SelectItem key={camera.id} value={camera.id}>
                  {camera.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={triggerFilter}
            onValueChange={setTriggerFilter}
          >
            <SelectTrigger className="w-[200px] bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Trigger type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="motion">Motion Detection</SelectItem>
              <SelectItem value="manual">Manual Recording</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={resetFilters}
            className="bg-background/50 backdrop-blur-sm hover:bg-accent/10"
          >
            <Filter className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
          
          <div className="ml-auto">
            <Tabs 
              defaultValue={viewMode} 
              onValueChange={setViewMode}
              className="w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2 bg-background/50 backdrop-blur-sm">
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="grid" className="mt-0">
            {filteredRecordings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredRecordings.map((recording) => (
                  <Card key={recording.id} className="group overflow-hidden border-border/50 backdrop-blur-sm bg-card/50 hover:bg-card/80 transition-all duration-300">
                    <div className="aspect-video bg-black relative cursor-pointer" onClick={() => handlePlayback(recording)}>
                      <img 
                        src={recording.thumbnail}
                        alt={`Recording from ${recording.cameraName}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <PlayCircle className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md text-white p-3 transform translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                        <p className="font-medium">{recording.cameraName}</p>
                        <p className="text-xs opacity-80">
                          {format(parseISO(recording.startTime), "MMM d, yyyy HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2 transition-colors",
                            recording.triggerType === 'motion' && "bg-sentinel-status-warning/20 text-sentinel-status-warning",
                            recording.triggerType === 'manual' && "bg-sentinel-blue/20 text-sentinel-blue",
                            recording.triggerType === 'scheduled' && "bg-sentinel-purple/20 text-sentinel-purple",
                          )}>
                            {recording.triggerType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {recording.duration 
                              ? formatDistanceStrict(0, recording.duration * 1000)
                              : "In progress"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-accent/20"
                            onClick={() => handleExport(recording.id)}
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteRecording(recording.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground backdrop-blur-xl bg-card/50 border border-border/50 rounded-xl">
                <p className="text-lg font-medium">No recordings found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list" className="mt-0">
            <div className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-xl overflow-hidden">
              <div className="bg-muted/50 p-4 grid grid-cols-12 text-sm font-medium">
                <div className="col-span-3">Date & Time</div>
                <div className="col-span-2">Camera</div>
                <div className="col-span-2">Trigger</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-1">Actions</div>
              </div>
              
              <div className="divide-y divide-border/50">
                {filteredRecordings.length > 0 ? (
                  filteredRecordings.map((recording) => (
                    <div key={recording.id} className="p-4 grid grid-cols-12 text-sm hover:bg-accent/5 transition-colors">
                      <div className="col-span-3 flex gap-3 items-center">
                        <div 
                          className="h-10 w-16 bg-black rounded overflow-hidden cursor-pointer"
                          onClick={() => handlePlayback(recording)}
                        >
                          <img 
                            src={recording.thumbnail}
                            alt={`Recording from ${recording.cameraName}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          {format(parseISO(recording.startTime), "MMM d, yyyy")}
                          <p className="text-muted-foreground">
                            {format(parseISO(recording.startTime), "HH:mm:ss")}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center">
                        {recording.cameraName}
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          recording.triggerType === 'motion' && "bg-sentinel-status-warning/10 text-sentinel-status-warning",
                          recording.triggerType === 'manual' && "bg-sentinel-blue/10 text-sentinel-blue",
                          recording.triggerType === 'scheduled' && "bg-sentinel-purple/10 text-sentinel-purple",
                        )}>
                          {recording.triggerType}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        {recording.duration 
                          ? formatDistanceStrict(0, recording.duration * 1000)
                          : "In progress"}
                      </div>
                      <div className="col-span-2 flex items-center">
                        {formatFileSize(recording.fileSize)}
                      </div>
                      <div className="col-span-1 flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => handleExport(recording.id)}
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteRecording(recording.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No recordings found matching your filters.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={playbackDialogOpen} onOpenChange={setPlaybackDialogOpen}>
        <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden backdrop-blur-xl bg-card/90 border-border/50">
          <div className="aspect-video bg-black w-full">
            {selectedRecording?.thumbnail && (
              <img 
                src={selectedRecording.thumbnail}
                alt={`Recording from ${selectedRecording.cameraName}`}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayCircle className="h-16 w-16 text-white opacity-70" />
            </div>
          </div>
          <div className="p-4 space-y-2">
            <DialogHeader>
              <DialogTitle>{selectedRecording?.cameraName} Recording</DialogTitle>
              <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                <div>
                  {selectedRecording && format(parseISO(selectedRecording.startTime), "MMM d, yyyy HH:mm:ss")}
                  {selectedRecording?.endTime && ` - ${format(parseISO(selectedRecording.endTime), "HH:mm:ss")}`}
                </div>
                <div className="flex gap-2 items-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    selectedRecording?.triggerType === 'motion' && "bg-sentinel-status-warning/10 text-sentinel-status-warning",
                    selectedRecording?.triggerType === 'manual' && "bg-sentinel-blue/10 text-sentinel-blue",
                    selectedRecording?.triggerType === 'scheduled' && "bg-sentinel-purple/10 text-sentinel-purple",
                  )}>
                    {selectedRecording?.triggerType}
                  </span>
                  {selectedRecording?.fileSize && (
                    <span>{formatFileSize(selectedRecording.fileSize)}</span>
                  )}
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectedRecording && handleExport(selectedRecording.id)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  if (selectedRecording) {
                    deleteRecording(selectedRecording.id);
                    setPlaybackDialogOpen(false);
                  }
                }}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Recording
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recordings;
