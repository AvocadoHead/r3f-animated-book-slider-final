import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export const PageNavigationFooter = ({
  pages,
  currentPage,
  onPageChange,
  onDeletePage,
  onReorder,
  user,
  viewingShared,
  translations
}) => {
  const t = translations;

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // Don't allow moving if same position
    if (sourceIndex === destinationIndex) return;

    // Don't allow moving first page (cover) or last page (back cover)
    if (sourceIndex === 0 || sourceIndex === pages.length - 1) return;
    if (destinationIndex === 0 || destinationIndex === pages.length - 1) return;

    onReorder(sourceIndex, destinationIndex);
  };

  const handleDelete = (e, pageId, pageIndex) => {
    e.stopPropagation();
    if (pages.length <= 2) {
      alert('Cannot delete - book must have at least 2 pages (cover and back)');
      return;
    }
    if (confirm(`Delete page ${pageIndex}? This cannot be undone.`)) {
      onDeletePage(pageId);
    }
  };

  return (
    <main className="pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col">
      <div className="flex-1"></div>
      <div className="w-full overflow-auto pointer-events-auto flex justify-center pb-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="pages" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="overflow-auto flex items-center gap-3 max-w-full px-6 py-2"
              >
                {pages.map((pageData, index) => {
                  const isFirst = index === 0;
                  const isLast = index === pages.length - 1;
                  const canDelete = !isFirst && !isLast && pages.length > 2 && user && !viewingShared;
                  const canDrag = !isFirst && !isLast && user && !viewingShared;

                  return (
                    <Draggable
                      key={pageData.id}
                      draggableId={pageData.id}
                      index={index}
                      isDragDisabled={!canDrag}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`relative group shrink-0 ${snapshot.isDragging ? 'z-50' : ''}`}
                        >
                          <button
                            className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base border whitespace-nowrap ${
                              index === currentPage
                                ? "bg-white/90 text-black font-bold shadow-lg"
                                : "bg-black/30 text-white backdrop-blur-sm"
                            } ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            onClick={() => onPageChange(index)}
                          >
                            {isFirst ? t.cover : `${t.page} ${index}`}
                          </button>
                          {canDelete && (
                            <button
                              onClick={(e) => handleDelete(e, pageData.id, index)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center justify-center"
                              title="Delete page"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                <button
                  className={`border-transparent hover:border-white transition-all duration-300 px-4 py-2 rounded-full text-base shrink-0 border whitespace-nowrap ${
                    currentPage === pages.length
                      ? "bg-white/90 text-black font-bold shadow-lg"
                      : "bg-black/30 text-white backdrop-blur-sm"
                  }`}
                  onClick={() => onPageChange(pages.length)}
                >
                  {t.backCover}
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </main>
  );
};
