import hashlib
import ipaddress
import socket
import urllib.parse
from typing import Tuple, Optional
import hmac
import time
from app.config import settings

# Blocked IP subnets (RFC 1918, RFC 3927, Loopback, Cloud Metadata)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),     # Carrier-grade NAT
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback IPv4
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local & AWS/GCP/Azure metadata
    ipaddress.ip_network("172.16.0.0/12"),    # Private class B
    ipaddress.ip_network("192.0.0.0/24"),      # IETF protocol assignments
    ipaddress.ip_network("192.0.2.0/24"),      # TEST-NET-1
    ipaddress.ip_network("192.168.0.0/16"),   # Private class C
    ipaddress.ip_network("198.18.0.0/15"),     # Network benchmark tests
    ipaddress.ip_network("198.51.100.0/24"),   # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),    # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),       # Multicast
    ipaddress.ip_network("240.0.0.0/4"),       # Reserved
    ipaddress.ip_network("255.255.255.255/32"),# Broadcast
    ipaddress.ip_network("::1/128"),           # Loopback IPv6
    ipaddress.ip_network("::/128"),            # Unspecified
    ipaddress.ip_network("fe80::/10"),         # Link-local IPv6
    ipaddress.ip_network("fc00::/7"),          # Unique Local IPv6
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "instance-data",
    "metadata",
}

def calculate_sha256(data: bytes) -> str:
    """Calculate the cryptographic SHA-256 fingerprint of evidence bytes."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest()

def is_ip_blocked(ip_str: str) -> bool:
    """Check if an IP address belongs to internal, loopback, or private ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
        # Unmap IPv4-mapped IPv6 addresses if present
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        return any(ip in net for net in BLOCKED_NETWORKS) or ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local
    except ValueError:
        return True

def validate_outbound_url(url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Strict SSRF validation:
    - Parses URL scheme (only http/https allowed)
    - Resolves host DNS to IP addresses
    - Rejects internal, private, loopback, link-local, and metadata addresses
    Returns: (is_safe, resolved_ip, error_message)
    """
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception as e:
        return False, None, f"Invalid URL syntax: {str(e)}"

    if parsed.scheme not in ("http", "https"):
        return False, None, "Unsupported protocol. Only HTTP and HTTPS links are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, None, "URL must contain a valid domain name or public IP address."

    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".local") or hostname_lower.endswith(".internal"):
        return False, None, "Target host is an internal or restricted network endpoint."

    # Resolve all DNS A and AAAA records for the host
    try:
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        return False, None, f"Could not resolve host '{hostname}': {str(e)}"
    except Exception as e:
        return False, None, f"DNS resolution failed: {str(e)}"

    if not addr_info:
        return False, None, f"No IP addresses found for hostname '{hostname}'."

    first_ip = None
    for entry in addr_info:
        sockaddr = entry[4]
        ip_addr = sockaddr[0]
        if not first_ip:
            first_ip = ip_addr
        if is_ip_blocked(ip_addr):
            return False, ip_addr, f"Access denied: Host resolves to internal or restricted IP address ({ip_addr})."

    return True, first_ip, None

def generate_signed_evidence_token(case_id: str, file_path: str, expiry_seconds: int = 3600) -> str:
    """Generate an HMAC-SHA256 signed token for temporary authenticated evidence retrieval."""
    expires_at = int(time.time()) + expiry_seconds
    raw_payload = f"{case_id}|{file_path}|{expires_at}"
    secret = (settings.SUPABASE_JWT_SECRET or "deeptrace-secret-token").encode("utf-8")
    sig = hmac.new(secret, raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{expires_at}.{sig}"

def verify_signed_evidence_token(case_id: str, file_path: str, token: str) -> bool:
    """Verify HMAC signature and timestamp expiration for evidence token."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return False
        expires_at_str, signature = parts
        expires_at = int(expires_at_str)
        if time.time() > expires_at:
            return False
        
        raw_payload = f"{case_id}|{file_path}|{expires_at}"
        secret = (settings.SUPABASE_JWT_SECRET or "deeptrace-secret-token").encode("utf-8")
        expected_sig = hmac.new(secret, raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False
