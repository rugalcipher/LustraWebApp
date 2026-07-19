import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { ACTIVE_INQUIRIES, PIPELINE_STAGES } from "@/mocks/internal";
import { cn } from "@/lib/utils";

const PRIORITY = {
  high: "text-error",
  medium: "text-warning",
  low: "text-muted-grey",
};

const COLUMN_META = {
  new: { label: "New", accent: "text-warning" },
  pending: { label: "Pending", accent: "text-rose-gold" },
  confirmed: { label: "Confirmed", accent: "text-success" },
  declined: { label: "Declined", accent: "text-error" },
};

export default function InquiryPipeline() {
  const [columns, setColumns] = useState(() => {
    const init = { new: [], pending: [], confirmed: [], declined: [] };
    ACTIVE_INQUIRIES.forEach((i) => init[i.stage]?.push(i));
    return init;
  });

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || source.droppableId === destination.droppableId && source.index === destination.index) return;
    setColumns((prev) => {
      const next = { ...prev };
      const [moved] = next[source.droppableId].splice(source.index, 1);
      moved.stage = destination.droppableId;
      next[destination.droppableId].splice(destination.index, 0, moved);
      return next;
    });
  };

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Management"
        title="Inquiry Pipeline"
        subtitle="Drag inquiries through stages — new, pending, confirmed, declined."
      />
      <div className="w-full px-5 lg:px-8 py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const meta = COLUMN_META[stage];
              const items = columns[stage];
              return (
                <div key={stage} className="flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className={cn("font-body text-[0.6rem] tracking-luxe uppercase", meta.accent)}>
                      {meta.label}
                    </span>
                    <span className="font-body text-[0.6rem] text-muted-grey">{items.length}</span>
                  </div>
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 min-h-[200px] rounded-md border border-white/[0.06] bg-deep-black/40 p-2 space-y-2 transition",
                          snapshot.isDraggingOver && "border-rose-gold/40 bg-rose-gold/5"
                        )}
                      >
                        {items.map((item, idx) => (
                          <Draggable key={item.id} draggableId={item.id} index={idx}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={cn(
                                  "bg-card-black/90 border border-white/[0.08] rounded-sm p-3 cursor-grab active:cursor-grabbing transition",
                                  snap.isDragging && "border-rose-gold/50 shadow-lg shadow-black/40"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-body text-sm text-ivory truncate">{item.client}</p>
                                  <span className={cn("w-1.5 h-1.5 rounded-full bg-current", PRIORITY[item.priority])} />
                                </div>
                                <p className="font-body text-[0.65rem] text-muted-grey mt-1">
                                  {item.talent}
                                </p>
                                <p className="font-body text-[0.6rem] text-soft-ivory/50 mt-1.5">
                                  {item.engagement} · {item.city}
                                </p>
                                <p className="font-body text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/60 mt-2">
                                  {item.date}
                                </p>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && (
                          <p className="text-center text-[0.6rem] text-muted-grey/50 py-6 font-body">Drop here</p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>

        <Card className="p-4 mt-6">
          <Eyebrow>How it works</Eyebrow>
          <p className="font-body text-sm text-soft-ivory/70 mt-2 leading-relaxed">
            Move inquiries left-to-right as they progress. Declined inquiries remain archived for reporting. Each move updates the concierge dashboard in real time.
          </p>
        </Card>
      </div>
    </div>
  );
}