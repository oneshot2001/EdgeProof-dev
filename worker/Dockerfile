# Production builds must pass reviewed full commit SHAs for SVF_SHA and
# SVF_EXAMPLES_SHA. Use ALLOW_UNPINNED_SVF=true only for local refresh builds.
FROM python:3.12-slim-bookworm AS svf-builder

ENV DEBIAN_FRONTEND=noninteractive

ARG SVF_SHA=master
ARG SVF_EXAMPLES_SHA=master
ARG ALLOW_UNPINNED_SVF=false

RUN if [ "$ALLOW_UNPINNED_SVF" != "true" ] \
        && { [ "$SVF_SHA" = "master" ] || [ "$SVF_EXAMPLES_SHA" = "master" ]; }; then \
        echo "SVF_SHA and SVF_EXAMPLES_SHA must be reviewed full commit SHAs for production builds"; \
        echo "Pass --build-arg ALLOW_UNPINNED_SVF=true only for local refresh builds"; \
        exit 1; \
    fi

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    git \
    libcurl4-openssl-dev \
    libglib2.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libgstreamer1.0-dev \
    libssl-dev \
    meson \
    ninja-build \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/AxisCommunications/signed-video-framework.git /opt/svf \
    && git -C /opt/svf checkout --detach "${SVF_SHA}" \
    && meson setup /opt/svf /opt/svf-build \
    && ninja -C /opt/svf-build \
    && ninja -C /opt/svf-build install

RUN git clone https://github.com/AxisCommunications/signed-video-framework-examples.git /opt/svf-examples \
    && git -C /opt/svf-examples checkout --detach "${SVF_EXAMPLES_SHA}" \
    && meson setup -Dbuild_all_apps=true /opt/svf-examples /opt/svf-examples-build \
    && ninja -C /opt/svf-examples-build \
    && ninja -C /opt/svf-examples-build install


FROM python:3.12-slim-bookworm AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PATH=/usr/local/bin:/usr/bin:/bin \
    LD_LIBRARY_PATH=/usr/local/lib:/usr/local/lib/x86_64-linux-gnu \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    bubblewrap \
    ca-certificates \
    ffmpeg \
    gstreamer1.0-libav \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-ugly \
    libcurl4 \
    libglib2.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer1.0-0 \
    libseccomp2 \
    libssl3 \
    seccomp \
    strace \
    && rm -rf /var/lib/apt/lists/*

COPY --from=svf-builder /usr/local/bin/ /usr/local/bin/
COPY --from=svf-builder /usr/local/lib/ /usr/local/lib/

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/sandbox_launcher.py /usr/local/bin/edgeproof-rlimit-launcher
RUN chmod 0755 /usr/local/bin/edgeproof-rlimit-launcher \
    && ldconfig \
    && ffprobe -version >/dev/null \
    && (command -v signed-video-validator || command -v sv_validator || command -v validator)

COPY certs/ /app/certs/
COPY app/ /app/app/
COPY tests/ /app/tests/

RUN useradd -r -u 10001 -m -d /home/svc -s /usr/sbin/nologin svc \
    && mkdir -p /tmp/edgeproof \
    && chown -R svc:svc /tmp/edgeproof

USER svc

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
