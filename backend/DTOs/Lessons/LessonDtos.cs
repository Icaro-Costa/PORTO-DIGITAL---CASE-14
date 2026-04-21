namespace NeuroMentor.Api.DTOs.Lessons;

public record GenerateModulesRequest(Guid LessonId, string Text, string Title);
public record SetModuleStatusRequest(string Status);

public record LessonDto(Guid Id, string Title, string SourceFileName, DateTime CreatedAt, List<ModuleDto> Modules);

public record ModuleDto(
    Guid Id,
    string Title,
    string Summary,
    List<string> Concepts,
    double Match,
    string Status,
    int Order
);

public record LessonUploadResponse(Guid LessonId, string Title, string Text, int Chars);

public record MergeModulesRequest(List<Guid> ModuleIds);
