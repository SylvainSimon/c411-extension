<?php

use App\Dto\C411\TorrentDto;
use DateMalformedStringException;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Throwable;

readonly class C411ApiService
{
    public function __construct(
        private HttpClientInterface                 $httpClient,
        private \App\Service\MovieNameParserService $movieNameParser,
        private string                              $csrfToken,
        private string                              $csrfCookie,
        private string                              $sessionCookie,
        private string                              $apiUrl = 'https://c411.org',
    )
    {
    }

    public function getTorrentInfo(string $infoHash): ?TorrentDto
    {
        $url = sprintf('%s/api/torrents/%s', $this->apiUrl, $infoHash);
        $data = $this->call($url, 'GET');

        try {

            return TorrentDto::fromArray($data);

        } catch (DateMalformedStringException $e) {
            return null;
        }
    }

    private function call(string $url, string $method = 'GET', ?array $payload = null): array
    {
        $options = [
            'headers' => [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'csrf-token' => $this->csrfToken,
                'Cookie' => sprintf('__csrf=%s; __Host-c411_session=%s', $this->csrfCookie, $this->sessionCookie),
                'Origin' => 'https://c411.org',
            ],
        ];

        if ($payload !== null) {
            $options['json'] = $payload;
        }

        try {

            $response = $this->httpClient->request($method, $url, $options);
            return $response->toArray();

        } catch (Throwable $e) {
            return [];
        }
    }
}
