using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using pmp.AuthDb;
using pmp.Server.Auth;

namespace pmp.Server.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName,
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return ValidationProblem(ToModelState(result));
        }

        var authResult = await jwtTokenService.CreateTokenPairAsync(user, GetIpAddress(), cancellationToken);
        return Ok(AuthResponse.FromAuthResult(authResult));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByNameAsync(request.UserName);
        if (user is null)
        {
            return Unauthorized();
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
        {
            return Unauthorized();
        }

        var authResult = await jwtTokenService.CreateTokenPairAsync(user, GetIpAddress(), cancellationToken);
        return Ok(AuthResponse.FromAuthResult(authResult));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(
        RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var authResult = await jwtTokenService.RefreshTokenPairAsync(
            request.RefreshToken,
            GetIpAddress(),
            cancellationToken);

        if (authResult is null)
        {
            return Unauthorized();
        }

        return Ok(AuthResponse.FromAuthResult(authResult));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(
        RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        await jwtTokenService.RevokeRefreshTokenAsync(request.RefreshToken, GetIpAddress(), cancellationToken);
        return NoContent();
    }

    private string? GetIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static ModelStateDictionary ToModelState(IdentityResult result)
    {
        var modelState = new ModelStateDictionary();

        foreach (var error in result.Errors)
        {
            modelState.AddModelError(error.Code, error.Description);
        }

        return modelState;
    }
}

public class RegisterRequest
{
    [Required]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [MinLength(12)]
    public string Password { get; set; } = string.Empty;

    [EmailAddress]
    public string? Email { get; set; }
}

public class LoginRequest
{
    [Required]
    public string UserName { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;

    public DateTimeOffset AccessTokenExpiresUtc { get; set; }

    public string RefreshToken { get; set; } = string.Empty;

    public DateTimeOffset RefreshTokenExpiresUtc { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public static AuthResponse FromAuthResult(AuthResult result)
    {
        return new AuthResponse
        {
            AccessToken = result.AccessToken,
            AccessTokenExpiresUtc = result.AccessTokenExpiresUtc,
            RefreshToken = result.RefreshToken,
            RefreshTokenExpiresUtc = result.RefreshTokenExpiresUtc,
            UserName = result.UserName,
            Email = result.Email
        };
    }
}
